import { createHash, randomUUID } from "node:crypto";
import { Prisma, PrismaClient } from "@prisma/client";
import {
  calculateHandoffRecoveryBackoff,
  DEFAULT_HANDOFF_RECOVERY_LEASE_MS,
  DEFAULT_HANDOFF_RECOVERY_MAX_ATTEMPTS,
  evaluateHandoffRecoveryEligibility,
  HANDOFF_ATTEMPT_SCHEMA_VERSION,
  HANDOFF_RECOVERY_SCHEMA_VERSION,
  sanitizeHandoffRecoveryTechnicalCode,
  type HandoffRecoveryAttemptResult,
  type HandoffRecoveryEligibility,
  type HandoffRecoverySafety,
} from "./handoff-recovery";
import {
  resolveOperationalHandoffDestination,
  verifyOperationalHandoffRemoteState,
  type ChatwootOperationalHandoffState,
  type OperationalHandoffDestination,
} from "./operational-handoff";
import type { OutboundRecoveryRunResult } from "./outbound-recovery-coordinator";

const recoveryOperationInclude = {
  conversation: {
    select: {
      id: true,
      companyId: true,
      assistantId: true,
      externalAccountId: true,
      externalConversationId: true,
      externalInboxId: true,
      currentContextVersion: true,
      controlRevision: true,
      aiActive: true,
      pausedByHuman: true,
    },
  },
  outboundDeliveries: {
    select: {
      id: true,
      status: true,
      attemptCount: true,
      externalMessageId: true,
      createdAt: true,
    },
    orderBy: [{ blockOrdinal: "asc" as const }, { createdAt: "asc" as const }],
  },
  attempts: {
    orderBy: { attemptNumber: "desc" as const },
    take: 5,
  },
} satisfies Prisma.AssistantHandoffOperationInclude;

export type HandoffRecoveryOperation = Prisma.AssistantHandoffOperationGetPayload<{
  include: typeof recoveryOperationInclude;
}>;

export type HandoffRemoteReadResult =
  | Readonly<{
      ok: true;
      state: ChatwootOperationalHandoffState;
      httpStatus: number;
      targetFingerprint: string;
    }>
  | Readonly<{
      ok: false;
      errorCode: string;
      httpStatus: number | null;
    }>;

export type HandoffRemoteMutationResult = Readonly<{
  result: "ACKNOWLEDGED" | "FAILED" | "AMBIGUOUS";
  safety: HandoffRecoverySafety;
  errorCode: string | null;
  httpStatus: number | null;
}>;

export type HandoffConfirmationResult = Readonly<{
  deliveryId: string | null;
  created: boolean;
  reused: boolean;
  status: string;
}>;

export type HandoffRecoveryRunResult = Readonly<{
  operationId: string;
  action:
    | "LOCALLY_BLOCKED"
    | "REMOTE_MUTATION_ATTEMPTED"
    | "REMOTE_CONFIRMED"
    | "CONFIRMATION_CREATED"
    | "CONFIRMATION_RECOVERED"
    | "RECONCILIATION_INCONCLUSIVE"
    | "SUPERSEDED"
    | "LEASE_ACTIVE"
    | "BACKOFF"
    | "BUDGET_EXHAUSTED"
    | "NOT_ELIGIBLE"
    | "CLAIM_LOST"
    | "NOOP";
  status: string;
  attemptCount: number;
  recoveryAttemptNumber: number;
}>;

type RecoveryLogger = {
  log?(message: string): void;
  warn?(message: string): void;
  error?(message: string): void;
};

type CoordinatorOptions = {
  prisma: PrismaClient;
  readRemote: (operation: HandoffRecoveryOperation) => Promise<HandoffRemoteReadResult>;
  mutateRemote: (input: {
    operation: HandoffRecoveryOperation;
    expectedTargetFingerprint: string;
    onBoundaryStart: () => Promise<void>;
  }) => Promise<HandoffRemoteMutationResult>;
  ensureConfirmation: (
    operation: HandoffRecoveryOperation,
  ) => Promise<HandoffConfirmationResult>;
  recoverConfirmation: (deliveryId: string) => Promise<OutboundRecoveryRunResult>;
  updateManifest?: (operationId: string) => Promise<void>;
  now?: () => Date;
  leaseMs?: number;
  maxMutationAttempts?: number;
  backoffScheduleMs?: readonly number[];
  backoffCapMs?: number;
  jitterRatio?: number;
  logger?: RecoveryLogger;
};

type ClaimResult = Readonly<{
  operation: HandoffRecoveryOperation;
  attemptId: string | null;
  claimToken: string | null;
  stale: boolean;
}>;

function fingerprintOwner(owner: string | null): string | null {
  if (!owner) return null;
  return `lease_${createHash("sha256").update(owner).digest("hex").slice(0, 16)}`;
}

function operationControlMatches(operation: HandoffRecoveryOperation): boolean {
  const conversation = operation.conversation;
  if (
    conversation.id !== operation.conversationId ||
    conversation.companyId !== operation.companyId ||
    conversation.assistantId !== operation.assistantId ||
    conversation.currentContextVersion !== operation.contextVersion
  ) {
    return false;
  }
  if (operation.status === "REQUESTED") {
    return (
      conversation.controlRevision === operation.expectedControlRevision &&
      conversation.aiActive === true &&
      conversation.pausedByHuman === false &&
      operation.postBlockControlRevision === null
    );
  }
  return (
    operation.postBlockControlRevision !== null &&
    conversation.controlRevision === operation.postBlockControlRevision &&
    conversation.aiActive === false &&
    conversation.pausedByHuman === true
  );
}

function operationScopeComplete(operation: HandoffRecoveryOperation): boolean {
  return Boolean(
    operation.conversation.externalAccountId &&
      operation.conversation.externalInboxId &&
      operation.conversation.externalConversationId,
  );
}

function resultFor(
  operation: HandoffRecoveryOperation,
  action: HandoffRecoveryRunResult["action"],
): HandoffRecoveryRunResult {
  return {
    operationId: operation.id,
    action,
    status: operation.status,
    attemptCount: operation.attemptCount,
    recoveryAttemptNumber: operation.attempts[0]?.attemptNumber ?? 0,
  };
}

function latestDelivery(operation: HandoffRecoveryOperation) {
  return operation.outboundDeliveries[0] ?? null;
}

function destinationChanged(
  operation: HandoffRecoveryOperation,
  destination: OperationalHandoffDestination,
): boolean {
  if (destination.resolution !== "RESOLVED") return false;
  return (
    operation.destinationType !== destination.type ||
    operation.destinationAssigneeId !== destination.assigneeId ||
    operation.destinationTeamId !== destination.teamId
  );
}

export class HandoffRecoveryCoordinator {
  private readonly prisma: PrismaClient;
  private readonly now: () => Date;
  private readonly leaseMs: number;
  private readonly maxMutationAttempts: number;
  private readonly logger: RecoveryLogger;

  constructor(private readonly options: CoordinatorOptions) {
    this.prisma = options.prisma;
    this.now = options.now ?? (() => new Date());
    this.leaseMs = options.leaseMs ?? DEFAULT_HANDOFF_RECOVERY_LEASE_MS;
    this.maxMutationAttempts =
      options.maxMutationAttempts ?? DEFAULT_HANDOFF_RECOVERY_MAX_ATTEMPTS;
    this.logger = options.logger ?? {};
  }

  private loadOperation(
    operationId: string,
    client: Prisma.TransactionClient | PrismaClient = this.prisma,
  ): Promise<HandoffRecoveryOperation> {
    return client.assistantHandoffOperation.findUniqueOrThrow({
      where: { id: operationId },
      include: recoveryOperationInclude,
    });
  }

  private async updateManifest(operationId: string): Promise<void> {
    await this.options.updateManifest?.(operationId);
  }

  private async markSuperseded(
    operation: HandoffRecoveryOperation,
    reason: string,
  ): Promise<HandoffRecoveryOperation> {
    const now = this.now();
    const current = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT id
        FROM "assistant_handoff_operations"
        WHERE id = ${operation.id}
        FOR UPDATE
      `;
      return this.markSupersededInTransaction(tx, operation.id, reason, now);
    });
    await this.updateManifest(current.id);
    return current;
  }

  private async markSupersededInTransaction(
    tx: Prisma.TransactionClient,
    operationId: string,
    reason: string,
    now: Date,
  ): Promise<HandoffRecoveryOperation> {
    const current = await this.loadOperation(operationId, tx);
    if (["COMPLETED", "FAILED_TERMINAL", "SUPERSEDED"].includes(current.status)) {
      return current;
    }
    const errorCode = sanitizeHandoffRecoveryTechnicalCode(
      reason,
      "HANDOFF_RECOVERY_CONTROL_STALE",
    );
    const activeAttempt = current.attemptOwner
      ? current.attempts.find(
          (attempt) =>
            attempt.owner === current.attemptOwner && attempt.finishedAt === null,
        )
      : null;
    if (activeAttempt) {
      await tx.assistantHandoffAttempt.updateMany({
        where: {
          id: activeAttempt.id,
          operationId,
          owner: current.attemptOwner!,
          finishedAt: null,
        },
        data: {
          finishedAt: now,
          result: "SUPERSEDED",
          recoverySafety: "NOT_RETRYABLE",
          errorClass: "CONTROL_STATE_STALE",
          errorCode,
        },
      });
    }
    await tx.assistantHandoffOperation.updateMany({
      where: {
        id: operationId,
        status: {
          notIn: ["COMPLETED", "FAILED_TERMINAL", "SUPERSEDED"],
        },
        attemptOwner: current.attemptOwner,
      },
      data: {
        status: "SUPERSEDED",
        recoverySafety: "NOT_RETRYABLE",
        attemptOwner: null,
        claimStartedAt: null,
        claimExpiresAt: null,
        nextEligibleAt: null,
        supersededAt: now,
        reconciliationStatus: "CONTROL_STALE",
        recoveryBlockedReason: errorCode,
        errorClass: "CONTROL_STATE_STALE",
        errorCode,
      },
    });
    return this.loadOperation(operationId, tx);
  }

  private async expireAbandonedClaim(
    operation: HandoffRecoveryOperation,
  ): Promise<HandoffRecoveryOperation> {
    const now = this.now();
    if (
      !operation.attemptOwner ||
      !operation.claimExpiresAt ||
      operation.claimExpiresAt > now
    ) {
      return operation;
    }
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT id
        FROM "assistant_conversations"
        WHERE id = ${operation.conversationId}
        FOR UPDATE
      `;
      const current = await this.loadOperation(operation.id, tx);
      if (
        !current.attemptOwner ||
        !current.claimExpiresAt ||
        current.claimExpiresAt > now
      ) {
        return current;
      }
      const activeAttempt = current.attempts.find(
        (attempt) =>
          attempt.owner === current.attemptOwner && attempt.finishedAt === null,
      );
      const boundaryStarted = Boolean(
        activeAttempt?.boundaryStartedAt ?? current.remoteBoundaryStartedAt,
      );
      if (activeAttempt) {
        await tx.assistantHandoffAttempt.update({
          where: { id: activeAttempt.id },
          data: {
            finishedAt: now,
            result: boundaryStarted
              ? "ABANDONED_AFTER_BOUNDARY"
              : "ABANDONED_BEFORE_BOUNDARY",
            recoverySafety: boundaryStarted
              ? "VERIFY_REMOTE_FIRST"
              : "PROVEN_SAFE",
            errorClass: "HANDOFF_RECOVERY_LEASE",
            errorCode: boundaryStarted
              ? "HANDOFF_RECOVERY_LEASE_EXPIRED_AFTER_BOUNDARY"
              : "HANDOFF_RECOVERY_LEASE_EXPIRED_BEFORE_BOUNDARY",
          },
        });
      }
      const terminalOrConfirmed = [
        "REMOTE_CONFIRMED",
        "CONFIRMATION_PENDING",
        "COMPLETED",
        "FAILED_TERMINAL",
        "SUPERSEDED",
      ].includes(current.status);
      const backoff = calculateHandoffRecoveryBackoff({
        operationId: current.id,
        attemptNumber: Math.max(activeAttempt?.attemptNumber ?? 1, 1),
        now,
        scheduleMs: this.options.backoffScheduleMs,
        capMs: this.options.backoffCapMs,
        jitterRatio: this.options.jitterRatio,
      });
      await tx.assistantHandoffOperation.update({
        where: { id: current.id },
        data: {
          attemptOwner: null,
          claimStartedAt: null,
          claimExpiresAt: null,
          ...(!terminalOrConfirmed && boundaryStarted
            ? { status: "RECONCILIATION_REQUIRED" }
            : {}),
          recoverySafety: terminalOrConfirmed
            ? current.recoverySafety
            : boundaryStarted
              ? "VERIFY_REMOTE_FIRST"
              : "PROVEN_SAFE",
          nextEligibleAt: terminalOrConfirmed ? null : backoff.nextEligibleAt,
          reconciliationStatus: boundaryStarted
            ? "LEASE_EXPIRED_RECONCILIATION_REQUIRED"
            : current.reconciliationStatus,
          recoveryBlockedReason: boundaryStarted
            ? "HANDOFF_RECOVERY_LEASE_EXPIRED_AFTER_BOUNDARY"
            : "HANDOFF_RECOVERY_LEASE_EXPIRED_BEFORE_BOUNDARY",
        },
      });
      return this.loadOperation(current.id, tx);
    });
  }

  private async ensureControlCurrent(
    operationId: string,
  ): Promise<{ operation: HandoffRecoveryOperation; stale: boolean }> {
    const operation = await this.loadOperation(operationId);
    if (operationControlMatches(operation)) {
      return { operation, stale: false };
    }
    if (["COMPLETED", "FAILED_TERMINAL", "SUPERSEDED"].includes(operation.status)) {
      return { operation, stale: operation.status === "SUPERSEDED" };
    }
    return {
      operation: await this.markSuperseded(
        operation,
        "HANDOFF_RECOVERY_CONTROL_STATE_STALE",
      ),
      stale: true,
    };
  }

  private async claimOperation(operationId: string): Promise<ClaimResult> {
    const now = this.now();
    const claimToken = randomUUID();
    const leaseExpiresAt = new Date(now.getTime() + this.leaseMs);
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT id
        FROM "assistant_conversations"
        WHERE id = (
          SELECT "conversationId"
          FROM "assistant_handoff_operations"
          WHERE id = ${operationId}
        )
        FOR UPDATE
      `;
      let operation = await this.loadOperation(operationId, tx);
      if (!operationControlMatches(operation)) {
        if (!["COMPLETED", "FAILED_TERMINAL", "SUPERSEDED"].includes(operation.status)) {
          operation = await this.markSupersededInTransaction(
            tx,
            operationId,
            "HANDOFF_RECOVERY_CONTROL_STATE_STALE",
            now,
          );
        }
        return { operation, attemptId: null, claimToken: null, stale: true };
      }
      const eligibility = evaluateHandoffRecoveryEligibility({
        status: operation.status,
        recoverySafety: operation.recoverySafety,
        attemptOwner: operation.attemptOwner,
        claimExpiresAt: operation.claimExpiresAt,
        nextEligibleAt: operation.nextEligibleAt,
        attemptCount: operation.attemptCount,
        maxAttempts: operation.maxAttempts,
        now,
      });
      if (
        eligibility === "LEASE_ACTIVE" ||
        eligibility === "BACKOFF" ||
        eligibility === "TERMINAL" ||
        eligibility === "INCONSISTENT_STATE"
      ) {
        return { operation, attemptId: null, claimToken: null, stale: false };
      }
      const nextRunNumber = Math.max(
        operation.attemptCount,
        operation.attempts[0]?.attemptNumber ?? 0,
      ) + 1;
      const transition = await tx.assistantHandoffOperation.updateMany({
        where: {
          id: operation.id,
          status: operation.status,
          OR: [
            { attemptOwner: null },
            { claimExpiresAt: null },
            { claimExpiresAt: { lte: now } },
          ],
        },
        data: {
          attemptOwner: claimToken,
          claimStartedAt: now,
          claimExpiresAt: leaseExpiresAt,
          recoveryBlockedReason: null,
        },
      });
      if (transition.count !== 1) {
        return {
          operation: await this.loadOperation(operation.id, tx),
          attemptId: null,
          claimToken: null,
          stale: false,
        };
      }
      const attempt = await tx.assistantHandoffAttempt.create({
        data: {
          operationId: operation.id,
          attemptNumber: nextRunNumber,
          owner: claimToken,
          startedAt: now,
          leaseExpiresAt,
          result: "CLAIMED",
          recoverySafety: operation.recoverySafety,
        },
        select: { id: true },
      });
      operation = await this.loadOperation(operation.id, tx);
      return {
        operation,
        attemptId: attempt.id,
        claimToken,
        stale: false,
      };
    });
  }

  private async finishRecoveryRun(input: {
    operationId: string;
    attemptId: string;
    claimToken: string;
    result: HandoffRecoveryAttemptResult;
    safety?: HandoffRecoverySafety;
    mutationResult?: string | null;
    verificationResult?: string | null;
    httpStatus?: number | null;
    errorClass?: string | null;
    errorCode?: string | null;
    nextEligibleAt?: Date | null;
    reconciliationStatus?: string | null;
    reconciliationEvidenceType?: string | null;
  }): Promise<HandoffRecoveryOperation> {
    const now = this.now();
    await this.prisma.$transaction(async (tx) => {
      const attempt = await tx.assistantHandoffAttempt.updateMany({
        where: {
          id: input.attemptId,
          operationId: input.operationId,
          owner: input.claimToken,
          finishedAt: null,
        },
        data: {
          finishedAt: now,
          result: input.result,
          ...(input.safety ? { recoverySafety: input.safety } : {}),
          mutationResult: input.mutationResult ?? null,
          verificationResult: input.verificationResult ?? null,
          httpStatus: input.httpStatus ?? null,
          errorClass: input.errorClass ?? null,
          errorCode: input.errorCode ?? null,
        },
      });
      if (attempt.count !== 1) {
        throw new Error("HANDOFF_RECOVERY_ATTEMPT_CLAIM_LOST");
      }
      const operation = await tx.assistantHandoffOperation.updateMany({
        where: {
          id: input.operationId,
          attemptOwner: input.claimToken,
        },
        data: {
          attemptOwner: null,
          claimStartedAt: null,
          claimExpiresAt: null,
          ...(input.safety ? { recoverySafety: input.safety } : {}),
          ...(input.nextEligibleAt !== undefined
            ? { nextEligibleAt: input.nextEligibleAt }
            : {}),
          ...(input.reconciliationStatus !== undefined
            ? { reconciliationStatus: input.reconciliationStatus }
            : {}),
          ...(input.reconciliationEvidenceType !== undefined
            ? {
                reconciliationEvidenceType: input.reconciliationEvidenceType,
                reconciledAt: now,
              }
            : {}),
          recoveryBlockedReason: input.errorCode ?? null,
        },
      });
      if (operation.count !== 1) {
        throw new Error("HANDOFF_RECOVERY_OPERATION_CLAIM_LOST");
      }
    });
    const operation = await this.loadOperation(input.operationId);
    await this.updateManifest(operation.id);
    return operation;
  }

  private async markBoundaryStarted(input: {
    operationId: string;
    attemptId: string;
    claimToken: string;
  }): Promise<void> {
    const now = this.now();
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT id
        FROM "assistant_conversations"
        WHERE id = (
          SELECT "conversationId"
          FROM "assistant_handoff_operations"
          WHERE id = ${input.operationId}
        )
        FOR UPDATE
      `;
      const operation = await this.loadOperation(input.operationId, tx);
      if (
        !operationControlMatches(operation) ||
        operation.status !== "REMOTE_PENDING" ||
        operation.attemptOwner !== input.claimToken ||
        !operation.claimExpiresAt ||
        operation.claimExpiresAt <= now
      ) {
        throw new Error("HANDOFF_RECOVERY_BOUNDARY_NOT_AUTHORIZED");
      }
      const attempt = await tx.assistantHandoffAttempt.updateMany({
        where: {
          id: input.attemptId,
          operationId: input.operationId,
          owner: input.claimToken,
          finishedAt: null,
          boundaryStartedAt: null,
          leaseExpiresAt: { gt: now },
        },
        data: {
          boundaryStartedAt: now,
          result: "REMOTE_BOUNDARY_STARTED",
          recoverySafety: "VERIFY_REMOTE_FIRST",
        },
      });
      const operationUpdate = await tx.assistantHandoffOperation.updateMany({
        where: {
          id: input.operationId,
          attemptOwner: input.claimToken,
          claimExpiresAt: { gt: now },
          status: "REMOTE_PENDING",
          contextVersion: operation.contextVersion,
          postBlockControlRevision: operation.postBlockControlRevision,
        },
        data: {
          remoteBoundaryStartedAt: now,
          recoverySafety: "VERIFY_REMOTE_FIRST",
        },
      });
      if (attempt.count !== 1 || operationUpdate.count !== 1) {
        throw new Error("HANDOFF_RECOVERY_ATTEMPT_CLAIM_LOST");
      }
    });
  }

  private async blockRequestedOperation(
    operation: HandoffRecoveryOperation,
  ): Promise<HandoffRecoveryOperation> {
    const now = this.now();
    const blocked = await this.prisma.$transaction(async (tx) => {
      const conversationUpdate = await tx.assistantConversation.updateMany({
        where: {
          id: operation.conversationId,
          companyId: operation.companyId,
          assistantId: operation.assistantId,
          currentContextVersion: operation.contextVersion,
          controlRevision: operation.expectedControlRevision,
          aiActive: true,
          pausedByHuman: false,
        },
        data: {
          aiActive: false,
          pausedByHuman: true,
          controlRevision: { increment: 1 },
          lastAiPausedAt: now,
          pauseReason: "OPERATIONAL_HUMAN_HANDOFF",
        },
      });
      if (conversationUpdate.count !== 1) return false;
      const operationUpdate = await tx.assistantHandoffOperation.updateMany({
        where: {
          id: operation.id,
          status: "REQUESTED",
          contextVersion: operation.contextVersion,
          expectedControlRevision: operation.expectedControlRevision,
        },
        data: {
          status: "LOCALLY_BLOCKED",
          postBlockControlRevision: operation.expectedControlRevision + 1,
          localBlockedAt: now,
          recoverySafety: "PROVEN_SAFE",
          nextEligibleAt: null,
          errorClass: null,
          errorCode: null,
        },
      });
      if (operationUpdate.count !== 1) {
        throw new Error("HANDOFF_RECOVERY_LOCAL_BLOCK_OPERATION_CAS_FAILED");
      }
      return true;
    });
    if (!blocked) {
      return this.markSuperseded(
        operation,
        "HANDOFF_RECOVERY_LOCAL_BLOCK_CAS_REJECTED",
      );
    }
    return this.loadOperation(operation.id);
  }

  private verifyRemote(
    operation: HandoffRecoveryOperation,
    state: ChatwootOperationalHandoffState,
  ) {
    const destination = resolveOperationalHandoffDestination(state);
    const externalConversationId = operation.conversation.externalConversationId ?? "";
    const accountId = operation.conversation.externalAccountId ?? "";
    const inboxId = operation.conversation.externalInboxId ?? "";
    return verifyOperationalHandoffRemoteState({
      state,
      destination,
      expectedConversationId: externalConversationId,
      expectedAccountId: accountId,
      expectedInboxId: inboxId,
    });
  }

  private async persistRemoteConfirmed(input: {
    operation: HandoffRecoveryOperation;
    claimToken: string;
    state: ChatwootOperationalHandoffState;
    destination: Exclude<OperationalHandoffDestination, { resolution: "UNRESOLVED" }>;
  }): Promise<HandoffRecoveryOperation> {
    const now = this.now();
    const externalInterventionObserved = destinationChanged(
      input.operation,
      input.destination,
    );
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT id
        FROM "assistant_conversations"
        WHERE id = ${input.operation.conversationId}
        FOR UPDATE
      `;
      const current = await this.loadOperation(input.operation.id, tx);
      if (
        !operationControlMatches(current) ||
        current.attemptOwner !== input.claimToken ||
        !current.claimExpiresAt ||
        current.claimExpiresAt <= now
      ) {
        throw new Error("HANDOFF_RECOVERY_REMOTE_CONFIRMATION_CLAIM_LOST");
      }
      const updated = await tx.assistantHandoffOperation.updateMany({
        where: {
          id: input.operation.id,
          attemptOwner: input.claimToken,
          claimExpiresAt: { gt: now },
          status: {
            in: [
              "LOCALLY_BLOCKED",
              "REMOTE_PENDING",
              "RECONCILIATION_REQUIRED",
              "REMOTE_CONFIRMED",
            ],
          },
          contextVersion: current.contextVersion,
          postBlockControlRevision: current.postBlockControlRevision,
        },
        data: {
          status: "REMOTE_CONFIRMED",
          destinationType: input.destination.type,
          destinationResolution: "RESOLVED",
          destinationAssigneeId: input.destination.assigneeId,
          destinationTeamId: input.destination.teamId,
          destinationInboxId: input.destination.inboxId,
          observedAiActive: input.state.aiActive,
          observedStatus: input.state.status,
          observedAssigneeId: input.state.assigneeId,
          observedTeamId: input.state.teamId,
          observedAccountId: input.state.accountId,
          observedInboxId: input.state.inboxId,
          observedConversationId: input.state.conversationId,
          remoteStateFingerprint: input.state.stateFingerprint,
          verifiedAt: new Date(input.state.observedAt),
          remoteVerificationResult: "CONFIRMED",
          remoteVerificationErrorCode: null,
          confirmationAuthorizedAt: now,
          recoverySafety: "NOT_RETRYABLE",
          nextEligibleAt: null,
          reconciliationStatus: "REMOTE_CONFIRMED",
          reconciliationEvidenceType: "CHATWOOT_CONVERSATION_READ",
          reconciledAt: now,
          externalInterventionObserved:
            current.externalInterventionObserved || externalInterventionObserved,
          externalInterventionAt: externalInterventionObserved
            ? now
            : current.externalInterventionAt,
          errorClass: null,
          errorCode: null,
        },
      });
      if (updated.count !== 1) {
        throw new Error("HANDOFF_RECOVERY_REMOTE_CONFIRMATION_CLAIM_LOST");
      }
    });
    return this.loadOperation(input.operation.id);
  }

  private async persistReconciliationRequired(input: {
    operation: HandoffRecoveryOperation;
    claimToken: string;
    errorCode: string;
    state?: ChatwootOperationalHandoffState | null;
    safety?: HandoffRecoverySafety;
    nextEligibleAt?: Date | null;
  }): Promise<HandoffRecoveryOperation> {
    const errorCode = sanitizeHandoffRecoveryTechnicalCode(
      input.errorCode,
      "HANDOFF_RECONCILIATION_REQUIRED",
    );
    const now = this.now();
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT id
        FROM "assistant_conversations"
        WHERE id = ${input.operation.conversationId}
        FOR UPDATE
      `;
      const current = await this.loadOperation(input.operation.id, tx);
      if (
        !operationControlMatches(current) ||
        current.attemptOwner !== input.claimToken ||
        !current.claimExpiresAt ||
        current.claimExpiresAt <= now
      ) {
        throw new Error("HANDOFF_RECOVERY_RECONCILIATION_CLAIM_LOST");
      }
      const updated = await tx.assistantHandoffOperation.updateMany({
        where: {
          id: input.operation.id,
          attemptOwner: input.claimToken,
          claimExpiresAt: { gt: now },
          status: {
            notIn: ["COMPLETED", "FAILED_TERMINAL", "SUPERSEDED"],
          },
          contextVersion: current.contextVersion,
          postBlockControlRevision: current.postBlockControlRevision,
        },
        data: {
          status: "RECONCILIATION_REQUIRED",
          recoverySafety: input.safety ?? "VERIFY_REMOTE_FIRST",
          nextEligibleAt:
            input.nextEligibleAt === undefined
              ? current.nextEligibleAt
              : input.nextEligibleAt,
          reconciliationStatus: "INCONCLUSIVE",
          reconciliationEvidenceType: input.state
            ? "CHATWOOT_CONVERSATION_READ"
            : "REMOTE_READ_FAILED",
          reconciledAt: now,
          recoveryBlockedReason: errorCode,
          errorClass: "HANDOFF_RECOVERY",
          errorCode,
          ...(input.state
            ? {
                observedAiActive: input.state.aiActive,
                observedStatus: input.state.status,
                observedAssigneeId: input.state.assigneeId,
                observedTeamId: input.state.teamId,
                observedAccountId: input.state.accountId,
                observedInboxId: input.state.inboxId,
                observedConversationId: input.state.conversationId,
                remoteStateFingerprint: input.state.stateFingerprint,
              }
            : {}),
        },
      });
      if (updated.count !== 1) {
        throw new Error("HANDOFF_RECOVERY_RECONCILIATION_CLAIM_LOST");
      }
    });
    return this.loadOperation(input.operation.id);
  }

  private async persistFailedTerminal(input: {
    operation: HandoffRecoveryOperation;
    claimToken: string;
    errorCode: string;
    state?: ChatwootOperationalHandoffState | null;
  }): Promise<HandoffRecoveryOperation> {
    const now = this.now();
    const errorCode = sanitizeHandoffRecoveryTechnicalCode(
      input.errorCode,
      "HANDOFF_RECOVERY_FAILED_TERMINAL",
    );
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT id
        FROM "assistant_conversations"
        WHERE id = ${input.operation.conversationId}
        FOR UPDATE
      `;
      const current = await this.loadOperation(input.operation.id, tx);
      if (
        !operationControlMatches(current) ||
        current.attemptOwner !== input.claimToken ||
        !current.claimExpiresAt ||
        current.claimExpiresAt <= now
      ) {
        throw new Error("HANDOFF_RECOVERY_TERMINAL_CLAIM_LOST");
      }
      const updated = await tx.assistantHandoffOperation.updateMany({
        where: {
          id: input.operation.id,
          attemptOwner: input.claimToken,
          claimExpiresAt: { gt: now },
          status: {
            notIn: ["COMPLETED", "FAILED_TERMINAL", "SUPERSEDED"],
          },
          contextVersion: current.contextVersion,
          postBlockControlRevision: current.postBlockControlRevision,
        },
        data: {
          status: "FAILED_TERMINAL",
          recoverySafety: "NOT_RETRYABLE",
          nextEligibleAt: null,
          reconciliationStatus: "FAILED_TERMINAL",
          reconciliationEvidenceType: input.state
            ? "CHATWOOT_CONVERSATION_READ"
            : "REMOTE_READ_FAILED",
          reconciledAt: now,
          recoveryBlockedReason: errorCode,
          errorClass: "HANDOFF_RECOVERY_TERMINAL",
          errorCode,
          ...(input.state
            ? {
                observedAiActive: input.state.aiActive,
                observedStatus: input.state.status,
                observedAssigneeId: input.state.assigneeId,
                observedTeamId: input.state.teamId,
                observedAccountId: input.state.accountId,
                observedInboxId: input.state.inboxId,
                observedConversationId: input.state.conversationId,
                remoteStateFingerprint: input.state.stateFingerprint,
              }
            : {}),
        },
      });
      if (updated.count !== 1) {
        throw new Error("HANDOFF_RECOVERY_TERMINAL_CLAIM_LOST");
      }
    });
    return this.loadOperation(input.operation.id);
  }

  private async ensureAndRecoverConfirmation(
    operation: HandoffRecoveryOperation,
  ): Promise<HandoffRecoveryRunResult> {
    const control = await this.ensureControlCurrent(operation.id);
    if (control.stale) return resultFor(control.operation, "SUPERSEDED");
    operation = control.operation;
    const confirmation = await this.options.ensureConfirmation(operation);
    operation = await this.loadOperation(operation.id);
    if (!confirmation.deliveryId) {
      await this.updateManifest(operation.id);
      return resultFor(operation, "RECONCILIATION_INCONCLUSIVE");
    }
    const outbound = await this.options.recoverConfirmation(confirmation.deliveryId);
    operation = await this.loadOperation(operation.id);
    await this.updateManifest(operation.id);
    return resultFor(
      operation,
      outbound.status === "ACKNOWLEDGED"
        ? "CONFIRMATION_RECOVERED"
        : confirmation.created
          ? "CONFIRMATION_CREATED"
          : "NOOP",
    );
  }

  private async processClaim(claim: ClaimResult): Promise<HandoffRecoveryRunResult> {
    let operation = claim.operation;
    if (!claim.claimToken || !claim.attemptId) {
      const eligibility: HandoffRecoveryEligibility = evaluateHandoffRecoveryEligibility({
        status: operation.status,
        recoverySafety: operation.recoverySafety,
        attemptOwner: operation.attemptOwner,
        claimExpiresAt: operation.claimExpiresAt,
        nextEligibleAt: operation.nextEligibleAt,
        attemptCount: operation.attemptCount,
        maxAttempts: operation.maxAttempts,
        now: this.now(),
      });
      if (claim.stale) return resultFor(operation, "SUPERSEDED");
      if (eligibility === "LEASE_ACTIVE") return resultFor(operation, "LEASE_ACTIVE");
      if (eligibility === "BACKOFF") return resultFor(operation, "BACKOFF");
      if (eligibility === "MUTATION_BUDGET_EXHAUSTED_RECONCILE_ONLY") {
        return resultFor(operation, "BUDGET_EXHAUSTED");
      }
      return resultFor(operation, "CLAIM_LOST");
    }

    const finish = (input: Omit<Parameters<HandoffRecoveryCoordinator["finishRecoveryRun"]>[0], "operationId" | "attemptId" | "claimToken">) =>
      this.finishRecoveryRun({
        operationId: operation.id,
        attemptId: claim.attemptId!,
        claimToken: claim.claimToken!,
        ...input,
      });

    if (operation.status === "REQUESTED") {
      operation = await this.blockRequestedOperation(operation);
      if (operation.status === "SUPERSEDED") {
        return resultFor(operation, "SUPERSEDED");
      }
    }

    const control = await this.ensureControlCurrent(operation.id);
    if (control.stale) {
      return resultFor(control.operation, "SUPERSEDED");
    }
    operation = control.operation;

    if (operation.status === "REMOTE_CONFIRMED") {
      await finish({
        result: "REMOTE_CONFIRMED",
        safety: "NOT_RETRYABLE",
        reconciliationStatus: "REMOTE_CONFIRMED",
        reconciliationEvidenceType: operation.reconciliationEvidenceType,
      });
      return this.ensureAndRecoverConfirmation(await this.loadOperation(operation.id));
    }
    if (operation.status === "CONFIRMATION_PENDING") {
      await finish({
        result: "CONFIRMATION_PENDING",
        safety: "NOT_RETRYABLE",
      });
      return this.ensureAndRecoverConfirmation(await this.loadOperation(operation.id));
    }

    if (!operationScopeComplete(operation)) {
      operation = await this.persistReconciliationRequired({
        operation,
        claimToken: claim.claimToken,
        errorCode: "CHATWOOT_HANDOFF_SCOPE_MISSING",
        safety: "NOT_RETRYABLE",
      });
      await finish({
        result: "RECONCILIATION_REQUIRED",
        safety: "NOT_RETRYABLE",
        errorClass: "CHATWOOT_HANDOFF_CONFIGURATION",
        errorCode: "CHATWOOT_HANDOFF_SCOPE_MISSING",
        reconciliationStatus: "INCONCLUSIVE",
        reconciliationEvidenceType: "CONFIGURATION_UNAVAILABLE",
      });
      return resultFor(operation, "RECONCILIATION_INCONCLUSIVE");
    }

    const read = await this.options.readRemote(operation);
    if (!read.ok) {
      const backoff = calculateHandoffRecoveryBackoff({
        operationId: operation.id,
        attemptNumber: Math.max(operation.attempts[0]?.attemptNumber ?? 0, 1),
        now: this.now(),
        scheduleMs: this.options.backoffScheduleMs,
        capMs: this.options.backoffCapMs,
        jitterRatio: this.options.jitterRatio,
      });
      operation = await this.persistReconciliationRequired({
        operation,
        claimToken: claim.claimToken,
        errorCode: read.errorCode,
        safety:
          operation.attemptCount === 0 && operation.status === "LOCALLY_BLOCKED"
            ? "PROVEN_SAFE"
            : "VERIFY_REMOTE_FIRST",
        nextEligibleAt: backoff.nextEligibleAt,
      });
      await finish({
        result: "REMOTE_READ_FAILED",
        safety: operation.recoverySafety as HandoffRecoverySafety,
        httpStatus: read.httpStatus,
        errorClass: "CHATWOOT_HANDOFF_READ",
        errorCode: read.errorCode,
        nextEligibleAt: backoff.nextEligibleAt,
        reconciliationStatus: "INCONCLUSIVE",
        reconciliationEvidenceType: "REMOTE_READ_FAILED",
      });
      return resultFor(operation, "RECONCILIATION_INCONCLUSIVE");
    }

    const verification = this.verifyRemote(operation, read.state);
    if (verification.verified) {
      operation = await this.persistRemoteConfirmed({
        operation,
        claimToken: claim.claimToken,
        state: verification.state,
        destination: verification.destination,
      });
      await finish({
        result: "REMOTE_CONFIRMED",
        safety: "NOT_RETRYABLE",
        verificationResult: "CONFIRMED",
        httpStatus: read.httpStatus,
        reconciliationStatus: "REMOTE_CONFIRMED",
        reconciliationEvidenceType: "CHATWOOT_CONVERSATION_READ",
      });
      return this.ensureAndRecoverConfirmation(await this.loadOperation(operation.id));
    }

    const destination = resolveOperationalHandoffDestination(read.state);
    if (destination.resolution !== "RESOLVED") {
      operation = await this.persistReconciliationRequired({
        operation,
        claimToken: claim.claimToken,
        errorCode: "DESTINATION_UNRESOLVED",
        state: read.state,
        safety: "VERIFY_REMOTE_FIRST",
      });
      await finish({
        result: "DESTINATION_UNRESOLVED",
        safety: "VERIFY_REMOTE_FIRST",
        verificationResult: verification.reasonCode,
        httpStatus: read.httpStatus,
        errorClass: "OPERATIONAL_HANDOFF_DESTINATION",
        errorCode: "DESTINATION_UNRESOLVED",
        reconciliationStatus: "INCONCLUSIVE",
        reconciliationEvidenceType: "CHATWOOT_CONVERSATION_READ",
      });
      return resultFor(operation, "RECONCILIATION_INCONCLUSIVE");
    }
    const mutationScopeOrStatusInvalid = [
      "CHATWOOT_CONVERSATION_ID_MISSING",
      "CHATWOOT_CONVERSATION_MISMATCH",
      "CHATWOOT_ACCOUNT_ID_MISSING",
      "CHATWOOT_ACCOUNT_MISMATCH",
      "CHATWOOT_INBOX_ID_MISSING",
      "CHATWOOT_INBOX_MISMATCH",
      "CHATWOOT_STATUS_NOT_HANDOFF_COMPATIBLE",
    ].includes(verification.reasonCode);
    if (mutationScopeOrStatusInvalid) {
      operation = await this.persistReconciliationRequired({
        operation,
        claimToken: claim.claimToken,
        errorCode: verification.reasonCode,
        state: read.state,
        safety: "NOT_RETRYABLE",
      });
      await finish({
        result: "MUTATION_BLOCKED_REMOTE_SCOPE",
        safety: "NOT_RETRYABLE",
        verificationResult: verification.reasonCode,
        httpStatus: read.httpStatus,
        errorClass: "CHATWOOT_HANDOFF_SCOPE",
        errorCode: verification.reasonCode,
        reconciliationStatus: "INCONCLUSIVE",
        reconciliationEvidenceType: "CHATWOOT_CONVERSATION_READ",
      });
      return resultFor(operation, "RECONCILIATION_INCONCLUSIVE");
    }
    if (
      operation.recoverySafety === "PROVEN_SAFE" &&
      operation.nextEligibleAt &&
      operation.nextEligibleAt > this.now()
    ) {
      operation = await this.persistReconciliationRequired({
        operation,
        claimToken: claim.claimToken,
        errorCode: "HANDOFF_MUTATION_BACKOFF_ACTIVE",
        state: read.state,
        safety: "PROVEN_SAFE",
        nextEligibleAt: operation.nextEligibleAt,
      });
      await finish({
        result: "BACKOFF",
        safety: "PROVEN_SAFE",
        verificationResult: verification.reasonCode,
        httpStatus: read.httpStatus,
        errorClass: "HANDOFF_RECOVERY_BACKOFF",
        errorCode: "HANDOFF_MUTATION_BACKOFF_ACTIVE",
        nextEligibleAt: operation.nextEligibleAt,
        reconciliationStatus: "INCONCLUSIVE",
        reconciliationEvidenceType: "CHATWOOT_CONVERSATION_READ",
      });
      return resultFor(operation, "BACKOFF");
    }

    const mutationIsSafe =
      operation.attemptCount === 0 ||
      operation.recoverySafety === "PROVEN_SAFE";
    if (!mutationIsSafe) {
      operation = await this.persistReconciliationRequired({
        operation,
        claimToken: claim.claimToken,
        errorCode: "HANDOFF_MUTATION_RETRY_NOT_PROVEN_SAFE",
        state: read.state,
        safety:
          operation.recoverySafety === "NOT_RETRYABLE"
            ? "NOT_RETRYABLE"
            : operation.recoverySafety === "UNKNOWN"
              ? "UNKNOWN"
              : "VERIFY_REMOTE_FIRST",
      });
      await finish({
        result: "MUTATION_BLOCKED_UNSAFE",
        safety: operation.recoverySafety as HandoffRecoverySafety,
        verificationResult: verification.reasonCode,
        httpStatus: read.httpStatus,
        errorClass: "HANDOFF_RECOVERY_SAFETY",
        errorCode: "HANDOFF_MUTATION_RETRY_NOT_PROVEN_SAFE",
        reconciliationStatus: "INCONCLUSIVE",
        reconciliationEvidenceType: "CHATWOOT_CONVERSATION_READ",
      });
      return resultFor(operation, "RECONCILIATION_INCONCLUSIVE");
    }
    if (operation.attemptCount >= Math.min(operation.maxAttempts, this.maxMutationAttempts)) {
      operation = await this.persistReconciliationRequired({
        operation,
        claimToken: claim.claimToken,
        errorCode: "HANDOFF_MUTATION_BUDGET_EXHAUSTED",
        state: read.state,
        safety: "NOT_RETRYABLE",
        nextEligibleAt: null,
      });
      operation = await finish({
        result: "BUDGET_EXHAUSTED",
        safety: "NOT_RETRYABLE",
        errorClass: "HANDOFF_RECOVERY_BUDGET",
        errorCode: "HANDOFF_MUTATION_BUDGET_EXHAUSTED",
        nextEligibleAt: null,
        reconciliationStatus: "MUTATION_BUDGET_EXHAUSTED",
        reconciliationEvidenceType: "CHATWOOT_CONVERSATION_READ",
      });
      return resultFor(operation, "BUDGET_EXHAUSTED");
    }

    const transition = await this.prisma.assistantHandoffOperation.updateMany({
      where: {
        id: operation.id,
        status: {
          in: ["LOCALLY_BLOCKED", "REMOTE_PENDING", "RECONCILIATION_REQUIRED"],
        },
        attemptOwner: claim.claimToken,
        claimExpiresAt: { gt: this.now() },
        attemptCount: operation.attemptCount,
        contextVersion: operation.contextVersion,
        postBlockControlRevision: operation.postBlockControlRevision,
      },
      data: {
        status: "REMOTE_PENDING",
        destinationType: destination.type,
        destinationResolution: "RESOLVED",
        destinationAssigneeId: destination.assigneeId,
        destinationTeamId: destination.teamId,
        destinationInboxId: destination.inboxId,
        attemptCount: { increment: 1 },
        lastAttemptAt: this.now(),
        recoverySafety: "VERIFY_REMOTE_FIRST",
        errorClass: null,
        errorCode: null,
      },
    });
    if (transition.count !== 1) {
      operation = await finish({
        result: "CLAIM_LOST",
        safety: "UNKNOWN",
        errorClass: "HANDOFF_RECOVERY_CLAIM",
        errorCode: "HANDOFF_MUTATION_CLAIM_LOST",
      });
      return resultFor(operation, "CLAIM_LOST");
    }
    operation = await this.loadOperation(operation.id);
    const mutation = await this.options.mutateRemote({
      operation,
      expectedTargetFingerprint: read.targetFingerprint,
      onBoundaryStart: () =>
        this.markBoundaryStarted({
          operationId: operation.id,
          attemptId: claim.attemptId!,
          claimToken: claim.claimToken!,
        }),
    });
    const mutationRecorded = await this.prisma.assistantHandoffOperation.updateMany({
      where: {
        id: operation.id,
        attemptOwner: claim.claimToken,
        claimExpiresAt: { gt: this.now() },
        status: "REMOTE_PENDING",
        contextVersion: operation.contextVersion,
        postBlockControlRevision: operation.postBlockControlRevision,
      },
      data: {
        remoteMutationResult: mutation.result,
        remoteMutationErrorCode: mutation.errorCode,
        recoverySafety: mutation.safety,
        errorClass: mutation.errorCode ? "CHATWOOT_HANDOFF_MUTATION" : null,
        errorCode: mutation.errorCode,
      },
    });
    if (mutationRecorded.count !== 1) {
      throw new Error("HANDOFF_RECOVERY_MUTATION_RESULT_CLAIM_LOST");
    }
    operation = await this.loadOperation(operation.id);
    const provenSafeRetryBackoff =
      mutation.safety === "PROVEN_SAFE"
        ? calculateHandoffRecoveryBackoff({
            operationId: operation.id,
            attemptNumber: Math.max(operation.attemptCount, 1),
            now: this.now(),
            scheduleMs: this.options.backoffScheduleMs,
            capMs: this.options.backoffCapMs,
            jitterRatio: this.options.jitterRatio,
          })
        : null;

    const postMutationControl = await this.ensureControlCurrent(operation.id);
    if (postMutationControl.stale) {
      return resultFor(postMutationControl.operation, "SUPERSEDED");
    }

    const verificationRead = await this.options.readRemote(postMutationControl.operation);
    if (verificationRead.ok) {
      const postVerification = this.verifyRemote(
        postMutationControl.operation,
        verificationRead.state,
      );
      if (postVerification.verified) {
        operation = await this.persistRemoteConfirmed({
          operation: postMutationControl.operation,
          claimToken: claim.claimToken,
          state: postVerification.state,
          destination: postVerification.destination,
        });
        await finish({
          result: "REMOTE_CONFIRMED",
          safety: "NOT_RETRYABLE",
          mutationResult: mutation.result,
          verificationResult: "CONFIRMED",
          httpStatus: mutation.httpStatus,
          reconciliationStatus: "REMOTE_CONFIRMED",
          reconciliationEvidenceType: "CHATWOOT_CONVERSATION_READ",
        });
        return this.ensureAndRecoverConfirmation(await this.loadOperation(operation.id));
      }
      if (mutation.safety === "NOT_RETRYABLE") {
        operation = await this.persistFailedTerminal({
          operation: postMutationControl.operation,
          claimToken: claim.claimToken,
          errorCode:
            mutation.errorCode ?? "HANDOFF_MUTATION_FAILED_TERMINAL",
          state: verificationRead.state,
        });
        await finish({
          result: "FAILED_TERMINAL",
          safety: "NOT_RETRYABLE",
          mutationResult: mutation.result,
          verificationResult: postVerification.reasonCode,
          httpStatus: mutation.httpStatus,
          errorClass: "CHATWOOT_HANDOFF_MUTATION",
          errorCode:
            mutation.errorCode ?? "HANDOFF_MUTATION_FAILED_TERMINAL",
          reconciliationStatus: "FAILED_TERMINAL",
          reconciliationEvidenceType: "CHATWOOT_CONVERSATION_READ",
        });
        return resultFor(operation, "REMOTE_MUTATION_ATTEMPTED");
      }
      operation = await this.persistReconciliationRequired({
        operation: postMutationControl.operation,
        claimToken: claim.claimToken,
        errorCode: postVerification.reasonCode,
        state: verificationRead.state,
        safety: mutation.safety,
        nextEligibleAt: provenSafeRetryBackoff?.nextEligibleAt ?? null,
      });
      await finish({
        result: "REMOTE_NOT_CONFIRMED",
        safety: operation.recoverySafety as HandoffRecoverySafety,
        mutationResult: mutation.result,
        verificationResult: postVerification.reasonCode,
        httpStatus: mutation.httpStatus,
        errorClass: "CHATWOOT_HANDOFF_VERIFICATION",
        errorCode: postVerification.reasonCode,
        reconciliationStatus: "INCONCLUSIVE",
        reconciliationEvidenceType: "CHATWOOT_CONVERSATION_READ",
        nextEligibleAt: provenSafeRetryBackoff?.nextEligibleAt ?? null,
      });
      return resultFor(operation, "REMOTE_MUTATION_ATTEMPTED");
    }

    if (mutation.safety === "NOT_RETRYABLE") {
      operation = await this.persistFailedTerminal({
        operation: postMutationControl.operation,
        claimToken: claim.claimToken,
        errorCode:
          mutation.errorCode ?? "HANDOFF_MUTATION_FAILED_TERMINAL",
      });
      await finish({
        result: "FAILED_TERMINAL",
        safety: "NOT_RETRYABLE",
        mutationResult: mutation.result,
        verificationResult: "FAILED",
        httpStatus: mutation.httpStatus,
        errorClass: "CHATWOOT_HANDOFF_MUTATION",
        errorCode:
          mutation.errorCode ?? "HANDOFF_MUTATION_FAILED_TERMINAL",
        reconciliationStatus: "FAILED_TERMINAL",
        reconciliationEvidenceType: "REMOTE_READ_FAILED",
      });
      return resultFor(operation, "REMOTE_MUTATION_ATTEMPTED");
    }
    operation = await this.persistReconciliationRequired({
      operation: postMutationControl.operation,
      claimToken: claim.claimToken,
      errorCode: verificationRead.errorCode,
      safety: mutation.safety,
      nextEligibleAt: provenSafeRetryBackoff?.nextEligibleAt ?? null,
    });
    await finish({
      result: "REMOTE_VERIFICATION_FAILED",
      safety: operation.recoverySafety as HandoffRecoverySafety,
      mutationResult: mutation.result,
      verificationResult: "FAILED",
      httpStatus: mutation.httpStatus,
      errorClass: "CHATWOOT_HANDOFF_VERIFICATION",
      errorCode: verificationRead.errorCode,
      reconciliationStatus: "INCONCLUSIVE",
      reconciliationEvidenceType: "REMOTE_READ_FAILED",
      nextEligibleAt: provenSafeRetryBackoff?.nextEligibleAt ?? null,
    });
    return resultFor(operation, "REMOTE_MUTATION_ATTEMPTED");
  }

  public async recoverOperation(operationId: string): Promise<HandoffRecoveryRunResult> {
    let operation = await this.loadOperation(operationId);
    operation = await this.expireAbandonedClaim(operation);
    if (["COMPLETED", "FAILED_TERMINAL", "SUPERSEDED"].includes(operation.status)) {
      return resultFor(operation, "NOOP");
    }
    const control = await this.ensureControlCurrent(operation.id);
    if (control.stale) return resultFor(control.operation, "SUPERSEDED");
    operation = control.operation;

    if (operation.status === "CONFIRMATION_PENDING") {
      const delivery = latestDelivery(operation);
      if (delivery) {
        const outbound = await this.options.recoverConfirmation(delivery.id);
        operation = await this.loadOperation(operation.id);
        await this.updateManifest(operation.id);
        return resultFor(
          operation,
          outbound.status === "ACKNOWLEDGED" ? "CONFIRMATION_RECOVERED" : "NOOP",
        );
      }
    }

    return this.processClaim(await this.claimOperation(operation.id));
  }

  public async runOnce(input: {
    operationIds?: string[];
    limit?: number;
  } = {}): Promise<HandoffRecoveryRunResult[]> {
    const operations = await this.prisma.assistantHandoffOperation.findMany({
      where: {
        ...(input.operationIds?.length ? { id: { in: input.operationIds } } : {}),
        status: {
          in: [
            "REQUESTED",
            "LOCALLY_BLOCKED",
            "REMOTE_PENDING",
            "REMOTE_CONFIRMED",
            "CONFIRMATION_PENDING",
            "RECONCILIATION_REQUIRED",
          ],
        },
      },
      select: { id: true },
      orderBy: [{ nextEligibleAt: "asc" }, { createdAt: "asc" }],
      take: Math.max(1, Math.min(input.limit ?? 25, 100)),
    });
    const results: HandoffRecoveryRunResult[] = [];
    for (const operation of operations) {
      try {
        results.push(await this.recoverOperation(operation.id));
      } catch (error) {
        this.logger.error?.(
          `Handoff recovery failed safely: operation=${operation.id} code=${sanitizeHandoffRecoveryTechnicalCode(
            error,
            "HANDOFF_RECOVERY_UNEXPECTED_FAILURE",
          )}`,
        );
        const current = await this.loadOperation(operation.id);
        results.push(resultFor(current, "NOOP"));
      }
    }
    return results;
  }

  public static manifestOwnerFingerprint(owner: string | null): string | null {
    return fingerprintOwner(owner);
  }

  public static readonly schemaVersion = HANDOFF_RECOVERY_SCHEMA_VERSION;
  public static readonly attemptSchemaVersion = HANDOFF_ATTEMPT_SCHEMA_VERSION;
}
