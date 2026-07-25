import { createHash, randomUUID } from "node:crypto";
import { Prisma, PrismaClient } from "@prisma/client";
import {
  DEFAULT_OUTBOUND_LEASE_MS,
  DEFAULT_OUTBOUND_MAX_ATTEMPTS,
  OUTBOUND_ATTEMPT_SCHEMA_VERSION,
  OUTBOUND_RECOVERABLE_PAYLOAD_CONTRACT,
  OUTBOUND_RECOVERY_SCHEMA_VERSION,
  OUTBOUND_REMOTE_REFERENCE_ATTRIBUTE,
  calculateOutboundBackoff,
  evaluateOutboundRecoveryEligibility,
  type OutboundDeliveryStatus,
  type OutboundRetrySafety,
} from "./outbound-delivery";

const recoveryDeliveryInclude = {
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
      status: true,
    },
  },
  assistantMessage: {
    select: {
      id: true,
      content: true,
      externalMessageId: true,
    },
  },
  handoffOperation: {
    select: {
      id: true,
      companyId: true,
      assistantId: true,
      conversationId: true,
      turnExecutionId: true,
      decisionId: true,
      contextVersion: true,
      policyVersion: true,
      expectedControlRevision: true,
      postBlockControlRevision: true,
      destinationResolution: true,
      destinationType: true,
      destinationAssigneeId: true,
      destinationTeamId: true,
      destinationInboxId: true,
      desiredAiActive: true,
      observedAiActive: true,
      observedStatus: true,
      observedAssigneeId: true,
      observedTeamId: true,
      observedAccountId: true,
      observedInboxId: true,
      observedConversationId: true,
      remoteVerificationResult: true,
      verifiedAt: true,
      confirmationAuthorizedAt: true,
      status: true,
      errorCode: true,
    },
  },
  attempts: {
    orderBy: { attemptNumber: "desc" as const },
  },
} satisfies Prisma.AssistantOutboundDeliveryInclude;

export type OutboundRecoveryDelivery = Prisma.AssistantOutboundDeliveryGetPayload<{
  include: typeof recoveryDeliveryInclude;
}>;

export type OutboundRecoverySendResult = Readonly<{
  status:
    | "ACKNOWLEDGED"
    | "FAILED_RETRYABLE"
    | "FAILED_TERMINAL"
    | "UNCERTAIN"
    | "CANCELLED_STALE";
  retrySafety: OutboundRetrySafety;
  externalMessageId: string | null;
  httpStatus: number | null;
  errorClass: string | null;
  errorCode: string | null;
}>;

export type OutboundReconciliationResult = Readonly<{
  status: "FOUND" | "ABSENCE_PROVEN" | "INCONCLUSIVE";
  externalMessageId: string | null;
  evidenceType:
    | "REMOTE_CONTENT_ATTRIBUTE"
    | "LOCAL_EXTERNAL_MESSAGE_ID"
    | "REMOTE_ABSENCE_PROOF"
    | "REMOTE_LIST_INCONCLUSIVE"
    | "REMOTE_READ_FAILED";
  errorCode?: string | null;
}>;

export type OutboundRecoveryRunResult = Readonly<{
  deliveryId: string;
  action:
    | "SENT"
    | "ATTEMPTED"
    | "RECONCILED"
    | "CANCELLED_STALE"
    | "LEASE_ACTIVE"
    | "BACKOFF"
    | "BUDGET_EXHAUSTED"
    | "RECONCILIATION_INCONCLUSIVE"
    | "BLOCKED_UNVERIFIED_PAYLOAD"
    | "NOT_ELIGIBLE"
    | "CLAIM_LOST";
  status: string;
  attemptCount: number;
}>;

type RecoveryClock = () => Date;

type RecoveryLogger = {
  log?(message: string): void;
  warn?(message: string): void;
  error?(message: string): void;
};

type CoordinatorOptions = {
  prisma: PrismaClient;
  send: (input: {
    delivery: OutboundRecoveryDelivery;
    content: string;
    handoff: boolean;
    remoteReferenceAttribute: typeof OUTBOUND_REMOTE_REFERENCE_ATTRIBUTE;
    remoteReferenceValue: string;
    onBoundaryStart: () => Promise<void>;
  }) => Promise<OutboundRecoverySendResult>;
  reconcile: (input: {
    delivery: OutboundRecoveryDelivery;
    remoteReferenceAttribute: typeof OUTBOUND_REMOTE_REFERENCE_ATTRIBUTE;
    remoteReferenceValue: string;
  }) => Promise<OutboundReconciliationResult>;
  now?: RecoveryClock;
  leaseMs?: number;
  maxAttempts?: number;
  backoffScheduleMs?: readonly number[];
  backoffCapMs?: number;
  jitterRatio?: number;
  logger?: RecoveryLogger;
};

type ClaimResult = Readonly<{
  delivery: OutboundRecoveryDelivery;
  attemptId: string | null;
  claimToken: string | null;
  stale: boolean;
}>;

function controlMatches(delivery: OutboundRecoveryDelivery): boolean {
  const operationalHandoff = delivery.handoffOperation;
  if (operationalHandoff) {
    const destinationMatches =
      (operationalHandoff.destinationType === "EXISTING_ASSIGNEE" &&
        operationalHandoff.destinationAssigneeId !== null &&
        operationalHandoff.observedAssigneeId ===
          operationalHandoff.destinationAssigneeId) ||
      (operationalHandoff.destinationType === "EXISTING_TEAM" &&
        operationalHandoff.destinationTeamId !== null &&
        operationalHandoff.observedTeamId === operationalHandoff.destinationTeamId);
    const remoteScopeMatches =
      delivery.conversation.externalAccountId !== null &&
      delivery.conversation.externalInboxId !== null &&
      delivery.conversation.externalConversationId !== null &&
      operationalHandoff.observedAccountId === delivery.conversation.externalAccountId &&
      operationalHandoff.observedInboxId === delivery.conversation.externalInboxId &&
      operationalHandoff.observedConversationId ===
        delivery.conversation.externalConversationId &&
      operationalHandoff.destinationInboxId === delivery.conversation.externalInboxId;
    return (
      delivery.handoff === true &&
      delivery.handoffOperationId === operationalHandoff.id &&
      operationalHandoff.companyId === delivery.companyId &&
      operationalHandoff.assistantId === delivery.assistantId &&
      operationalHandoff.conversationId === delivery.conversationId &&
      operationalHandoff.turnExecutionId === delivery.turnExecutionId &&
      operationalHandoff.decisionId === delivery.decisionId &&
      operationalHandoff.policyVersion === delivery.policyVersion &&
      operationalHandoff.contextVersion === delivery.expectedContextVersion &&
      operationalHandoff.expectedControlRevision + 1 ===
        operationalHandoff.postBlockControlRevision &&
      operationalHandoff.postBlockControlRevision ===
        delivery.expectedControlRevision &&
      operationalHandoff.destinationResolution === "RESOLVED" &&
      destinationMatches &&
      remoteScopeMatches &&
      operationalHandoff.desiredAiActive === false &&
      operationalHandoff.observedAiActive === false &&
      (operationalHandoff.observedStatus === "open" ||
        operationalHandoff.observedStatus === "pending") &&
      operationalHandoff.remoteVerificationResult === "CONFIRMED" &&
      operationalHandoff.verifiedAt !== null &&
      operationalHandoff.confirmationAuthorizedAt !== null &&
      ["REMOTE_CONFIRMED", "CONFIRMATION_PENDING", "COMPLETED"].includes(
        operationalHandoff.status,
      ) &&
      delivery.conversation.id === delivery.conversationId &&
      delivery.conversation.currentContextVersion === delivery.expectedContextVersion &&
      delivery.conversation.controlRevision === delivery.expectedControlRevision &&
      delivery.conversation.aiActive === false &&
      delivery.conversation.pausedByHuman === true
    );
  }
  if (delivery.handoff === true || delivery.handoffOperationId !== null) {
    return false;
  }
  return (
    delivery.conversation.id === delivery.conversationId &&
    delivery.conversation.currentContextVersion === delivery.expectedContextVersion &&
    delivery.conversation.controlRevision === delivery.expectedControlRevision &&
    delivery.conversation.aiActive === true &&
    delivery.conversation.pausedByHuman === false
  );
}

function sanitizeTechnicalCode(value: unknown, fallback: string): string {
  const text = typeof value === "string" ? value.trim().toUpperCase() : "";
  return /^[A-Z0-9_:-]{1,80}$/.test(text) ? text : fallback;
}

function fingerprintLeaseOwner(value: string | null): string | null {
  return value
    ? `lease_${createHash("sha256").update(value).digest("hex").slice(0, 16)}`
    : null;
}

export class OutboundRecoveryCoordinator {
  private readonly prisma: PrismaClient;
  private readonly now: RecoveryClock;
  private readonly leaseMs: number;
  private readonly maxAttempts: number;
  private readonly logger: RecoveryLogger;

  constructor(private readonly options: CoordinatorOptions) {
    this.prisma = options.prisma;
    this.now = options.now ?? (() => new Date());
    this.leaseMs = Math.max(1_000, options.leaseMs ?? DEFAULT_OUTBOUND_LEASE_MS);
    this.maxAttempts = Math.max(1, options.maxAttempts ?? DEFAULT_OUTBOUND_MAX_ATTEMPTS);
    this.logger = options.logger ?? {};
  }

  private async loadDelivery(
    deliveryId: string,
    client: Prisma.TransactionClient | PrismaClient = this.prisma,
  ): Promise<OutboundRecoveryDelivery> {
    return client.assistantOutboundDelivery.findUniqueOrThrow({
      where: { id: deliveryId },
      include: recoveryDeliveryInclude,
    });
  }

  private async lockConversation(
    tx: Prisma.TransactionClient,
    delivery: OutboundRecoveryDelivery,
  ): Promise<void> {
    await tx.$queryRaw(
      Prisma.sql`
        SELECT "id"
        FROM "assistant_conversations"
        WHERE "id" = ${delivery.conversationId}
          AND "assistantId" = ${delivery.assistantId}
          AND "companyId" = ${delivery.companyId}
        FOR UPDATE
      `,
    );
  }

  private async cancelStale(
    tx: Prisma.TransactionClient,
    delivery: OutboundRecoveryDelivery,
  ): Promise<OutboundRecoveryDelivery> {
    const now = this.now();
    const activeAttempt =
      delivery.attempts.find(
        (attempt) =>
          attempt.result === "SENDING" &&
          (delivery.attemptOwner === null || attempt.owner === delivery.attemptOwner),
      ) ?? null;
    const boundaryMayHaveBeenCrossed =
      Boolean(activeAttempt?.boundaryStartedAt) ||
      (delivery.status === "UNCERTAIN" &&
        delivery.retrySafety === "RECONCILE_REQUIRED");
    const deliveryStatus: "UNCERTAIN" | "CANCELLED_STALE" =
      boundaryMayHaveBeenCrossed ? "UNCERTAIN" : "CANCELLED_STALE";
    const retrySafety: OutboundRetrySafety = boundaryMayHaveBeenCrossed
      ? "RECONCILE_REQUIRED"
      : "NOT_RETRYABLE";
    const errorCode = boundaryMayHaveBeenCrossed
      ? "CONTROL_CHANGED_AFTER_OUTBOUND_BOUNDARY"
      : "BLOCKED_CONTROL_STATE_RECOVERY";
    await tx.assistantOutboundAttempt.updateMany({
      where: {
        deliveryId: delivery.id,
        result: "SENDING",
        ...(delivery.attemptOwner ? { owner: delivery.attemptOwner } : {}),
      },
      data: {
        finishedAt: now,
        result: deliveryStatus,
        retrySafety,
        errorClass: "CONTROL_STATE_STALE",
        errorCode,
      },
    });
    await tx.assistantOutboundDelivery.updateMany({
      where: {
        id: delivery.id,
        status: { in: ["PENDING", "SENDING", "FAILED_RETRYABLE", "UNCERTAIN"] },
      },
      data: {
        status: deliveryStatus,
        retrySafety,
        attemptOwner: null,
        claimStartedAt: null,
        claimExpiresAt: null,
        nextEligibleAt: null,
        failedAt: now,
        errorClass: "CONTROL_STATE_STALE",
        errorCode,
        recoveryBlockedReason: boundaryMayHaveBeenCrossed
          ? "RECONCILIATION_REQUIRED"
          : "CONTROL_STATE_STALE",
      },
    });
    if (delivery.handoffOperationId) {
      const operationUpdate = await tx.assistantHandoffOperation.updateMany({
        where: {
          id: delivery.handoffOperationId,
          status: {
            in: [
              "REMOTE_CONFIRMED",
              "CONFIRMATION_PENDING",
              "SUPERSEDED",
            ],
          },
        },
        data: {
          status: "SUPERSEDED",
          supersededAt: now,
          errorClass: "CONTROL_STATE_STALE",
          errorCode,
        },
      });
      if (operationUpdate.count !== 1) {
        throw new Error("HANDOFF_OPERATION_STALE_TRANSITION_FAILED");
      }
    }
    return this.loadDelivery(delivery.id, tx);
  }

  private async ensureControlCurrent(deliveryId: string): Promise<{
    delivery: OutboundRecoveryDelivery;
    stale: boolean;
  }> {
    return this.prisma.$transaction(async (tx) => {
      let delivery = await this.loadDelivery(deliveryId, tx);
      await this.lockConversation(tx, delivery);
      delivery = await this.loadDelivery(deliveryId, tx);
      if (!controlMatches(delivery)) {
        return { delivery: await this.cancelStale(tx, delivery), stale: true };
      }
      return { delivery, stale: false };
    });
  }

  public async claimDelivery(
    deliveryId: string,
    options: { allowUnverifiedPayload?: boolean } = {},
  ): Promise<ClaimResult> {
    return this.prisma.$transaction(async (tx) => {
      let delivery = await this.loadDelivery(deliveryId, tx);
      await this.lockConversation(tx, delivery);
      delivery = await this.loadDelivery(deliveryId, tx);
      if (!controlMatches(delivery)) {
        return {
          delivery: await this.cancelStale(tx, delivery),
          attemptId: null,
          claimToken: null,
          stale: true,
        };
      }

      const now = this.now();
      const eligibility = evaluateOutboundRecoveryEligibility({
        ...delivery,
        now,
      });
      if (
        eligibility !== "ELIGIBLE_PENDING" &&
        eligibility !== "ELIGIBLE_PROVEN_SAFE_RETRY"
      ) {
        return { delivery, attemptId: null, claimToken: null, stale: false };
      }
      if (
        delivery.payloadContractVersion !== OUTBOUND_RECOVERABLE_PAYLOAD_CONTRACT &&
        !options.allowUnverifiedPayload
      ) {
        await tx.assistantOutboundDelivery.update({
          where: { id: delivery.id },
          data: { recoveryBlockedReason: "PAYLOAD_CONTRACT_UNVERIFIED" },
        });
        return {
          delivery: await this.loadDelivery(delivery.id, tx),
          attemptId: null,
          claimToken: null,
          stale: false,
        };
      }

      const claimToken = `outbound_claim_${randomUUID()}`;
      const claimExpiresAt = new Date(now.getTime() + this.leaseMs);
      const attemptNumber = delivery.attemptCount + 1;
      const claim = await tx.assistantOutboundDelivery.updateMany({
        where: {
          id: delivery.id,
          status: delivery.status,
          attemptCount: delivery.attemptCount,
          attemptOwner: null,
          expectedContextVersion: delivery.expectedContextVersion,
          expectedControlRevision: delivery.expectedControlRevision,
          ...(delivery.status === "FAILED_RETRYABLE"
            ? { retrySafety: "PROVEN_SAFE" }
            : {}),
        },
        data: {
          status: "SENDING",
          attemptCount: { increment: 1 },
          maxAttempts: delivery.maxAttempts || this.maxAttempts,
          attemptOwner: claimToken,
          attemptedAt: now,
          claimStartedAt: now,
          claimExpiresAt,
          nextEligibleAt: null,
          retrySafety: "UNKNOWN",
          errorClass: null,
          errorCode: null,
          recoveryBlockedReason: null,
        },
      });
      if (claim.count !== 1) {
        return {
          delivery: await this.loadDelivery(delivery.id, tx),
          attemptId: null,
          claimToken: null,
          stale: false,
        };
      }
      const attempt = await tx.assistantOutboundAttempt.create({
        data: {
          deliveryId: delivery.id,
          attemptNumber,
          owner: claimToken,
          startedAt: now,
          leaseExpiresAt: claimExpiresAt,
          result: "SENDING",
          retrySafety: "UNKNOWN",
        },
      });
      return {
        delivery: await this.loadDelivery(delivery.id, tx),
        attemptId: attempt.id,
        claimToken,
        stale: false,
      };
    });
  }

  public async markBoundaryStarted(input: {
    attemptId: string;
    claimToken: string;
  }): Promise<void> {
    const startedAt = this.now();
    const update = await this.prisma.assistantOutboundAttempt.updateMany({
      where: {
        id: input.attemptId,
        owner: input.claimToken,
        result: "SENDING",
        boundaryStartedAt: null,
      },
      data: { boundaryStartedAt: startedAt },
    });
    if (update.count !== 1) throw new Error("OUTBOUND_ATTEMPT_BOUNDARY_MARK_REJECTED");
  }

  private async finishNonHandoffClaim(input: {
    deliveryId: string;
    attemptId: string;
    claimToken: string;
    result: OutboundRecoverySendResult;
    now: Date;
  }): Promise<OutboundRecoveryDelivery> {
    const attemptUpdate = await this.prisma.assistantOutboundAttempt.updateMany({
      where: {
        id: input.attemptId,
        deliveryId: input.deliveryId,
        owner: input.claimToken,
        result: "SENDING",
      },
      data: {
        finishedAt: input.now,
        result: input.result.status,
        retrySafety: input.result.retrySafety,
        httpStatus: input.result.httpStatus,
        externalMessageId: input.result.externalMessageId,
        errorClass: input.result.errorClass,
        errorCode: input.result.errorCode,
      },
    });
    if (attemptUpdate.count !== 1) throw new Error("OUTBOUND_ATTEMPT_CLAIM_LOST");

    const current = await this.loadDelivery(input.deliveryId);
    const budgetExhausted =
      input.result.status === "FAILED_RETRYABLE" &&
      current.attemptCount >= current.maxAttempts;
    const finalStatus: Exclude<OutboundDeliveryStatus, "PENDING" | "SENDING"> =
      budgetExhausted ? "FAILED_TERMINAL" : input.result.status;
    const retrySafety: OutboundRetrySafety = budgetExhausted
      ? "NOT_RETRYABLE"
      : input.result.retrySafety;
    const backoff =
      finalStatus === "FAILED_RETRYABLE" && retrySafety === "PROVEN_SAFE"
        ? calculateOutboundBackoff({
            deliveryId: current.id,
            attemptNumber: current.attemptCount,
            now: input.now,
            scheduleMs: this.options.backoffScheduleMs,
            capMs: this.options.backoffCapMs,
            jitterRatio: this.options.jitterRatio,
          })
        : null;
    const deliveryUpdate = await this.prisma.assistantOutboundDelivery.updateMany({
      where: {
        id: input.deliveryId,
        status: "SENDING",
        attemptOwner: input.claimToken,
      },
      data: {
        status: finalStatus,
        retrySafety,
        attemptOwner: null,
        claimStartedAt: null,
        claimExpiresAt: null,
        nextEligibleAt: backoff?.nextEligibleAt ?? null,
        acknowledgedAt: finalStatus === "ACKNOWLEDGED" ? input.now : null,
        failedAt: finalStatus === "ACKNOWLEDGED" ? null : input.now,
        externalMessageId: input.result.externalMessageId,
        errorClass: budgetExhausted
          ? "OUTBOUND_RECOVERY"
          : input.result.errorClass,
        errorCode: budgetExhausted
          ? "RECOVERY_BUDGET_EXHAUSTED"
          : input.result.errorCode,
        recoveryBlockedReason: budgetExhausted
          ? "RECOVERY_BUDGET_EXHAUSTED"
          : null,
      },
    });
    if (deliveryUpdate.count !== 1) {
      throw new Error("OUTBOUND_DELIVERY_FINALIZATION_FAILED");
    }
    return this.loadDelivery(input.deliveryId);
  }

  public async finishClaim(input: {
    deliveryId: string;
    attemptId: string;
    claimToken: string;
    result: OutboundRecoverySendResult;
    persistMessageReference?: boolean;
  }): Promise<OutboundRecoveryDelivery> {
    const now = this.now();
    const initial = await this.loadDelivery(input.deliveryId);
    const delivery = !initial.handoffOperationId
      ? await this.finishNonHandoffClaim({ ...input, now })
      : await this.prisma.$transaction(async (tx) => {
      let current = await this.loadDelivery(input.deliveryId, tx);
      if (current.handoffOperationId) {
        await this.lockConversation(tx, current);
        current = await this.loadDelivery(input.deliveryId, tx);
      }
      const attemptUpdate = await tx.assistantOutboundAttempt.updateMany({
        where: {
          id: input.attemptId,
          deliveryId: input.deliveryId,
          owner: input.claimToken,
          result: "SENDING",
        },
        data: {
          finishedAt: now,
          result: input.result.status,
          retrySafety: input.result.retrySafety,
          httpStatus: input.result.httpStatus,
          externalMessageId: input.result.externalMessageId,
          errorClass: input.result.errorClass,
          errorCode: input.result.errorCode,
        },
      });
      if (attemptUpdate.count !== 1) throw new Error("OUTBOUND_ATTEMPT_CLAIM_LOST");

      const budgetExhausted =
        input.result.status === "FAILED_RETRYABLE" &&
        current.attemptCount >= current.maxAttempts;
      const finalStatus: Exclude<OutboundDeliveryStatus, "PENDING" | "SENDING"> =
        budgetExhausted ? "FAILED_TERMINAL" : input.result.status;
      const retrySafety: OutboundRetrySafety = budgetExhausted
        ? "NOT_RETRYABLE"
        : input.result.retrySafety;
      const backoff =
        finalStatus === "FAILED_RETRYABLE" && retrySafety === "PROVEN_SAFE"
          ? calculateOutboundBackoff({
              deliveryId: current.id,
              attemptNumber: current.attemptCount,
              now,
              scheduleMs: this.options.backoffScheduleMs,
              capMs: this.options.backoffCapMs,
              jitterRatio: this.options.jitterRatio,
            })
          : null;
      const deliveryUpdate = await tx.assistantOutboundDelivery.updateMany({
        where: {
          id: input.deliveryId,
          status: "SENDING",
          attemptOwner: input.claimToken,
        },
        data: {
          status: finalStatus,
          retrySafety,
          attemptOwner: null,
          claimStartedAt: null,
          claimExpiresAt: null,
          nextEligibleAt: backoff?.nextEligibleAt ?? null,
          acknowledgedAt: finalStatus === "ACKNOWLEDGED" ? now : null,
          failedAt: finalStatus === "ACKNOWLEDGED" ? null : now,
          externalMessageId: input.result.externalMessageId,
          errorClass: budgetExhausted
            ? "OUTBOUND_RECOVERY"
            : input.result.errorClass,
          errorCode: budgetExhausted
            ? "RECOVERY_BUDGET_EXHAUSTED"
            : input.result.errorCode,
          recoveryBlockedReason: budgetExhausted
            ? "RECOVERY_BUDGET_EXHAUSTED"
            : null,
        },
      });
      if (deliveryUpdate.count !== 1) {
        throw new Error("OUTBOUND_DELIVERY_FINALIZATION_FAILED");
      }
      let updated = await this.loadDelivery(input.deliveryId, tx);
      if (updated.handoffOperationId) {
        const controlStillMatches = controlMatches(updated);
        const targetStatus =
          finalStatus === "ACKNOWLEDGED" && controlStillMatches
            ? "COMPLETED"
            : finalStatus === "CANCELLED_STALE" || !controlStillMatches
              ? "SUPERSEDED"
              : "CONFIRMATION_PENDING";
        const operationUpdate = await tx.assistantHandoffOperation.updateMany({
          where: {
            id: updated.handoffOperationId,
            status: {
              in:
                targetStatus === "COMPLETED"
                  ? ["REMOTE_CONFIRMED", "CONFIRMATION_PENDING", "COMPLETED"]
                  : targetStatus === "SUPERSEDED"
                    ? [
                        "REMOTE_CONFIRMED",
                        "CONFIRMATION_PENDING",
                        "COMPLETED",
                        "SUPERSEDED",
                      ]
                    : ["REMOTE_CONFIRMED", "CONFIRMATION_PENDING"],
            },
          },
          data:
            targetStatus === "COMPLETED"
              ? {
                  status: "COMPLETED",
                  completedAt: now,
                  errorClass: null,
                  errorCode: null,
                }
              : targetStatus === "SUPERSEDED"
                ? {
                    status: "SUPERSEDED",
                    supersededAt: now,
                    errorClass: "CONTROL_STATE_STALE",
                    errorCode:
                      input.result.errorCode ?? "BLOCKED_CONTROL_STATE_RECOVERY",
                  }
                : {
                    status: "CONFIRMATION_PENDING",
                    errorClass:
                      input.result.errorClass ?? "HANDOFF_CONFIRMATION_OUTBOUND",
                    errorCode:
                      input.result.errorCode ?? "HANDOFF_CONFIRMATION_OUTBOUND_FAILED",
                  },
        });
        if (operationUpdate.count !== 1) {
          throw new Error("HANDOFF_OPERATION_FINALIZATION_FAILED");
        }
        updated = await this.loadDelivery(input.deliveryId, tx);
      }
          return updated;
        });
    if (
      input.persistMessageReference !== false &&
      delivery.status === "ACKNOWLEDGED" &&
      input.result.externalMessageId
    ) {
      await this.prisma.assistantConversationMessage
        .updateMany({
          where: { id: delivery.assistantMessageId },
          data: { externalMessageId: input.result.externalMessageId },
        })
        .catch(() => ({ count: 0 }));
    }
    await this.updateManifest(delivery);
    return delivery;
  }

  private async expireAbandonedClaim(
    delivery: OutboundRecoveryDelivery,
  ): Promise<OutboundRecoveryDelivery> {
    const attempt = delivery.attempts[0] ?? null;
    const now = this.now();
    const boundaryStarted = Boolean(attempt?.boundaryStartedAt);
    const status = boundaryStarted ? "UNCERTAIN" : "FAILED_RETRYABLE";
    const retrySafety: OutboundRetrySafety = boundaryStarted
      ? "RECONCILE_REQUIRED"
      : "PROVEN_SAFE";
    const backoff = boundaryStarted
      ? null
      : calculateOutboundBackoff({
          deliveryId: delivery.id,
          attemptNumber: delivery.attemptCount,
          now,
          scheduleMs: this.options.backoffScheduleMs,
          capMs: this.options.backoffCapMs,
          jitterRatio: this.options.jitterRatio,
        });

    await this.prisma.$transaction(async (tx) => {
      if (attempt) {
        await tx.assistantOutboundAttempt.updateMany({
          where: {
            id: attempt.id,
            result: "SENDING",
            owner: delivery.attemptOwner ?? undefined,
          },
          data: {
            finishedAt: now,
            result: boundaryStarted
              ? "ABANDONED_AFTER_BOUNDARY"
              : "ABANDONED_BEFORE_BOUNDARY",
            retrySafety,
            errorClass: "OUTBOUND_LEASE_EXPIRED",
            errorCode: boundaryStarted
              ? "LEASE_EXPIRED_AFTER_BOUNDARY"
              : "LEASE_EXPIRED_BEFORE_BOUNDARY",
          },
        });
      }
      await tx.assistantOutboundDelivery.updateMany({
        where: {
          id: delivery.id,
          status: "SENDING",
          attemptOwner: delivery.attemptOwner,
          claimExpiresAt: { lte: now },
        },
        data: {
          status,
          retrySafety,
          attemptOwner: null,
          claimStartedAt: null,
          claimExpiresAt: null,
          nextEligibleAt: backoff?.nextEligibleAt ?? null,
          failedAt: now,
          errorClass: "OUTBOUND_LEASE_EXPIRED",
          errorCode: boundaryStarted
            ? "LEASE_EXPIRED_AFTER_BOUNDARY"
            : "LEASE_EXPIRED_BEFORE_BOUNDARY",
          recoveryBlockedReason: boundaryStarted
            ? "RECONCILIATION_REQUIRED"
            : null,
        },
      });
    });
    const updated = await this.loadDelivery(delivery.id);
    await this.updateManifest(updated);
    return updated;
  }

  private async markBudgetExhausted(
    delivery: OutboundRecoveryDelivery,
  ): Promise<OutboundRecoveryDelivery> {
    await this.prisma.assistantOutboundDelivery.updateMany({
      where: {
        id: delivery.id,
        status: { in: ["PENDING", "FAILED_RETRYABLE"] },
        attemptCount: { gte: delivery.maxAttempts },
      },
      data: {
        status: "FAILED_TERMINAL",
        retrySafety: "NOT_RETRYABLE",
        nextEligibleAt: null,
        failedAt: this.now(),
        errorClass: "OUTBOUND_RECOVERY",
        errorCode: "RECOVERY_BUDGET_EXHAUSTED",
        recoveryBlockedReason: "RECOVERY_BUDGET_EXHAUSTED",
      },
    });
    const updated = await this.loadDelivery(delivery.id);
    await this.updateManifest(updated);
    return updated;
  }

  private async repairAcknowledgedHandoffOperation(
    delivery: OutboundRecoveryDelivery,
  ): Promise<OutboundRecoveryDelivery> {
    if (
      delivery.status !== "ACKNOWLEDGED" ||
      !delivery.handoffOperationId ||
      !delivery.handoffOperation ||
      delivery.handoffOperation.status === "COMPLETED"
    ) {
      return delivery;
    }
    return this.prisma.$transaction(async (tx) => {
      let current = await this.loadDelivery(delivery.id, tx);
      await this.lockConversation(tx, current);
      current = await this.loadDelivery(delivery.id, tx);
      if (
        current.status !== "ACKNOWLEDGED" ||
        !current.handoffOperationId ||
        !current.handoffOperation
      ) {
        return current;
      }
      const controlStillMatches = controlMatches(current);
      const operationUpdate = await tx.assistantHandoffOperation.updateMany({
        where: {
          id: current.handoffOperationId,
          status: {
            in: controlStillMatches
              ? ["REMOTE_CONFIRMED", "CONFIRMATION_PENDING", "COMPLETED"]
              : [
                  "REMOTE_CONFIRMED",
                  "CONFIRMATION_PENDING",
                  "COMPLETED",
                  "SUPERSEDED",
                ],
          },
        },
        data: controlStillMatches
          ? {
              status: "COMPLETED",
              completedAt: current.acknowledgedAt ?? this.now(),
              errorClass: null,
              errorCode: null,
            }
          : {
              status: "SUPERSEDED",
              supersededAt: this.now(),
              errorClass: "CONTROL_STATE_STALE",
              errorCode: "BLOCKED_CONTROL_STATE_ACK_REPAIR",
            },
      });
      if (operationUpdate.count !== 1) {
        throw new Error("HANDOFF_OPERATION_ACK_REPAIR_FAILED");
      }
      return this.loadDelivery(current.id, tx);
    });
  }

  private async reconcileDelivery(
    delivery: OutboundRecoveryDelivery,
  ): Promise<OutboundRecoveryRunResult> {
    const result = await this.options.reconcile({
      delivery,
      remoteReferenceAttribute: OUTBOUND_REMOTE_REFERENCE_ATTRIBUTE,
      remoteReferenceValue: delivery.id,
    });
    const now = this.now();
    if (result.status === "FOUND" && result.externalMessageId) {
      const updated = await this.prisma.$transaction(async (tx) => {
        let current = await this.loadDelivery(delivery.id, tx);
        if (current.handoffOperationId) {
          await this.lockConversation(tx, current);
          current = await this.loadDelivery(delivery.id, tx);
        }
        const deliveryUpdate = await tx.assistantOutboundDelivery.updateMany({
          where: {
            id: delivery.id,
            status: current.status,
            attemptCount: current.attemptCount,
          },
          data: {
            status: "ACKNOWLEDGED",
            retrySafety: "NOT_RETRYABLE",
            attemptOwner: null,
            claimStartedAt: null,
            claimExpiresAt: null,
            nextEligibleAt: null,
            acknowledgedAt: now,
            failedAt: null,
            externalMessageId: result.externalMessageId,
            errorClass: null,
            errorCode: null,
            reconciliationStatus: "FOUND",
            reconciliationEvidenceType: result.evidenceType,
            reconciledAt: now,
            recoveryBlockedReason: null,
          },
        });
        if (deliveryUpdate.count !== 1) {
          throw new Error("OUTBOUND_RECONCILIATION_FINALIZATION_FAILED");
        }
        current = await this.loadDelivery(delivery.id, tx);
        if (current.handoffOperationId) {
          const controlStillMatches = controlMatches(current);
          const operationUpdate = await tx.assistantHandoffOperation.updateMany({
            where: {
              id: current.handoffOperationId,
              status: {
                in: controlStillMatches
                  ? ["REMOTE_CONFIRMED", "CONFIRMATION_PENDING", "COMPLETED"]
                  : [
                      "REMOTE_CONFIRMED",
                      "CONFIRMATION_PENDING",
                      "COMPLETED",
                      "SUPERSEDED",
                    ],
              },
            },
            data: controlStillMatches
              ? {
                  status: "COMPLETED",
                  completedAt: now,
                  errorClass: null,
                  errorCode: null,
                }
              : {
                  status: "SUPERSEDED",
                  supersededAt: now,
                  errorClass: "CONTROL_STATE_STALE",
                  errorCode: "BLOCKED_CONTROL_STATE_RECONCILIATION",
                },
          });
          if (operationUpdate.count !== 1) {
            throw new Error("HANDOFF_OPERATION_RECONCILIATION_FAILED");
          }
        }
        return this.loadDelivery(delivery.id, tx);
      });
      await this.prisma.assistantConversationMessage
        .updateMany({
          where: { id: delivery.assistantMessageId },
          data: { externalMessageId: result.externalMessageId },
        })
        .catch(() => ({ count: 0 }));
      await this.updateManifest(updated);
      return {
        deliveryId: updated.id,
        action: "RECONCILED",
        status: updated.status,
        attemptCount: updated.attemptCount,
      };
    }
    if (result.status === "ABSENCE_PROVEN") {
      const backoff = calculateOutboundBackoff({
        deliveryId: delivery.id,
        attemptNumber: Math.max(delivery.attemptCount, 1),
        now,
        scheduleMs: this.options.backoffScheduleMs,
        capMs: this.options.backoffCapMs,
        jitterRatio: this.options.jitterRatio,
      });
      await this.prisma.assistantOutboundDelivery.update({
        where: { id: delivery.id },
        data: {
          status: "FAILED_RETRYABLE",
          retrySafety: "PROVEN_SAFE",
          attemptOwner: null,
          claimStartedAt: null,
          claimExpiresAt: null,
          nextEligibleAt: backoff.nextEligibleAt,
          reconciliationStatus: "ABSENCE_PROVEN",
          reconciliationEvidenceType: result.evidenceType,
          reconciledAt: now,
          recoveryBlockedReason: null,
        },
      });
    } else {
      await this.prisma.assistantOutboundDelivery.update({
        where: { id: delivery.id },
        data: {
          status: "UNCERTAIN",
          retrySafety: "RECONCILE_REQUIRED",
          reconciliationStatus: "INCONCLUSIVE",
          reconciliationEvidenceType: result.evidenceType,
          reconciledAt: now,
          recoveryBlockedReason: sanitizeTechnicalCode(
            result.errorCode,
            "RECONCILIATION_INCONCLUSIVE",
          ),
        },
      });
    }
    const updated = await this.loadDelivery(delivery.id);
    await this.updateManifest(updated);
    return {
      deliveryId: updated.id,
      action: "RECONCILIATION_INCONCLUSIVE",
      status: updated.status,
      attemptCount: updated.attemptCount,
    };
  }

  private async updateManifest(delivery: OutboundRecoveryDelivery): Promise<void> {
    const runtimeLog = await this.prisma.assistantRuntimeLog.findFirst({
      where: { assistantMessageId: delivery.assistantMessageId },
      orderBy: { createdAt: "desc" },
      select: { id: true, metadata: true },
    });
    if (!runtimeLog?.metadata || typeof runtimeLog.metadata !== "object") return;
    const metadata = runtimeLog.metadata as Record<string, any>;
    const manifest = metadata.turnExecutionManifest;
    if (!manifest || typeof manifest !== "object") return;
    const latestAttempt = delivery.attempts[0] ?? null;
    const handoffOperation = delivery.handoffOperationId
      ? await this.prisma.assistantHandoffOperation.findUnique({
          where: { id: delivery.handoffOperationId },
          select: {
            status: true,
            confirmationAuthorizedAt: true,
            errorCode: true,
          },
        })
      : null;
    const handoffConfirmationAuthorized = Boolean(
      handoffOperation?.confirmationAuthorizedAt &&
        ["REMOTE_CONFIRMED", "CONFIRMATION_PENDING", "COMPLETED"].includes(
          handoffOperation.status,
        ) &&
        delivery.status !== "CANCELLED_STALE",
    );
    const deliveries = Array.isArray(manifest.outbound?.deliveries)
      ? manifest.outbound.deliveries.map((reference: Record<string, any>) =>
          reference.deliveryId === delivery.id
            ? {
                ...reference,
                status: delivery.status,
                retrySafety: delivery.retrySafety,
                attemptCount: delivery.attemptCount,
                maxAttempts: delivery.maxAttempts,
                claimStartedAt: delivery.claimStartedAt?.toISOString() ?? null,
                claimExpiresAt: delivery.claimExpiresAt?.toISOString() ?? null,
                nextEligibleAt: delivery.nextEligibleAt?.toISOString() ?? null,
                externalMessageId: delivery.externalMessageId,
                errorClass: delivery.errorClass,
                errorCode: delivery.errorCode,
                recovery: {
                  schemaVersion: OUTBOUND_RECOVERY_SCHEMA_VERSION,
                  attemptSchemaVersion: OUTBOUND_ATTEMPT_SCHEMA_VERSION,
                  attemptNumber: latestAttempt?.attemptNumber ?? delivery.attemptCount,
                  leaseOwner: fingerprintLeaseOwner(delivery.attemptOwner),
                  leaseStartedAt: delivery.claimStartedAt?.toISOString() ?? null,
                  leaseExpiresAt: delivery.claimExpiresAt?.toISOString() ?? null,
                  retrySafety: delivery.retrySafety,
                  eligibility: evaluateOutboundRecoveryEligibility({
                    ...delivery,
                    now: this.now(),
                  }),
                  nextEligibleAt: delivery.nextEligibleAt?.toISOString() ?? null,
                  reconciliationStatus: delivery.reconciliationStatus,
                  reconciliationEvidenceType: delivery.reconciliationEvidenceType,
                  result: delivery.status,
                  blockingReason: delivery.recoveryBlockedReason,
                },
              }
            : reference,
        )
      : [];
    await this.prisma.assistantRuntimeLog.update({
      where: { id: runtimeLog.id },
      data: {
        metadata: {
          ...metadata,
          turnExecutionManifest: {
            ...manifest,
            ...(handoffOperation && manifest.handoff
              ? {
                  handoff: {
                    ...manifest.handoff,
                    status: handoffOperation.status,
                    confirmation: {
                      ...manifest.handoff.confirmation,
                      authorized: handoffConfirmationAuthorized,
                      deliveryId: delivery.id,
                      result: !handoffConfirmationAuthorized
                        ? "NOT_AUTHORIZED"
                        : handoffOperation.status === "COMPLETED" &&
                            delivery.status === "ACKNOWLEDGED"
                          ? "ACKNOWLEDGED"
                          : delivery.status === "FAILED_RETRYABLE" ||
                              delivery.status === "FAILED_TERMINAL" ||
                              delivery.status === "UNCERTAIN"
                            ? "FAILED"
                            : "PENDING",
                    },
                    blockingReason: handoffOperation.errorCode,
                  },
                }
              : {}),
            outbound: {
              ...manifest.outbound,
              deliveries,
            },
          },
        } as Prisma.InputJsonValue,
      },
    });
  }

  public async recoverDelivery(deliveryId: string): Promise<OutboundRecoveryRunResult> {
    const control = await this.ensureControlCurrent(deliveryId);
    if (control.stale) {
      await this.updateManifest(control.delivery);
      return {
        deliveryId,
        action: "CANCELLED_STALE",
        status: control.delivery.status,
        attemptCount: control.delivery.attemptCount,
      };
    }
    let delivery = control.delivery;
    if (
      delivery.status === "ACKNOWLEDGED" &&
      delivery.handoffOperation &&
      delivery.handoffOperation.status !== "COMPLETED"
    ) {
      delivery = await this.repairAcknowledgedHandoffOperation(delivery);
      await this.updateManifest(delivery);
      return {
        deliveryId,
        action: "RECONCILED",
        status: delivery.status,
        attemptCount: delivery.attemptCount,
      };
    }
    let eligibility = evaluateOutboundRecoveryEligibility({ ...delivery, now: this.now() });
    if (eligibility === "LEASE_ACTIVE") {
      return {
        deliveryId,
        action: "LEASE_ACTIVE",
        status: delivery.status,
        attemptCount: delivery.attemptCount,
      };
    }
    if (eligibility === "LEASE_EXPIRED") {
      delivery = await this.expireAbandonedClaim(delivery);
      eligibility = evaluateOutboundRecoveryEligibility({ ...delivery, now: this.now() });
    }
    if (eligibility === "BUDGET_EXHAUSTED") {
      delivery = await this.markBudgetExhausted(delivery);
      return {
        deliveryId,
        action: "BUDGET_EXHAUSTED",
        status: delivery.status,
        attemptCount: delivery.attemptCount,
      };
    }
    if (eligibility === "RECONCILIATION_REQUIRED") {
      return this.reconcileDelivery(delivery);
    }
    if (eligibility === "BACKOFF") {
      return {
        deliveryId,
        action: "BACKOFF",
        status: delivery.status,
        attemptCount: delivery.attemptCount,
      };
    }
    if (
      eligibility !== "ELIGIBLE_PENDING" &&
      eligibility !== "ELIGIBLE_PROVEN_SAFE_RETRY"
    ) {
      return {
        deliveryId,
        action: "NOT_ELIGIBLE",
        status: delivery.status,
        attemptCount: delivery.attemptCount,
      };
    }
    if (delivery.payloadContractVersion !== OUTBOUND_RECOVERABLE_PAYLOAD_CONTRACT) {
      await this.prisma.assistantOutboundDelivery.update({
        where: { id: delivery.id },
        data: { recoveryBlockedReason: "PAYLOAD_CONTRACT_UNVERIFIED" },
      });
      delivery = await this.loadDelivery(delivery.id);
      await this.updateManifest(delivery);
      return {
        deliveryId,
        action: "BLOCKED_UNVERIFIED_PAYLOAD",
        status: delivery.status,
        attemptCount: delivery.attemptCount,
      };
    }

    const claim = await this.claimDelivery(delivery.id);
    if (!claim.claimToken || !claim.attemptId) {
      return {
        deliveryId,
        action: claim.stale ? "CANCELLED_STALE" : "CLAIM_LOST",
        status: claim.delivery.status,
        attemptCount: claim.delivery.attemptCount,
      };
    }
    const beforeSend = await this.ensureControlCurrent(delivery.id);
    if (beforeSend.stale) {
      await this.updateManifest(beforeSend.delivery);
      return {
        deliveryId,
        action: "CANCELLED_STALE",
        status: beforeSend.delivery.status,
        attemptCount: beforeSend.delivery.attemptCount,
      };
    }

    try {
      const result = await this.options.send({
        delivery: beforeSend.delivery,
        content: beforeSend.delivery.assistantMessage.content,
        handoff: beforeSend.delivery.handoff,
        remoteReferenceAttribute: OUTBOUND_REMOTE_REFERENCE_ATTRIBUTE,
        remoteReferenceValue: beforeSend.delivery.id,
        onBoundaryStart: () =>
          this.markBoundaryStarted({
            attemptId: claim.attemptId!,
            claimToken: claim.claimToken!,
          }),
      });
      delivery = await this.finishClaim({
        deliveryId: delivery.id,
        attemptId: claim.attemptId,
        claimToken: claim.claimToken,
        result,
      });
      return {
        deliveryId,
        action: "SENT",
        status: delivery.status,
        attemptCount: delivery.attemptCount,
      };
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message === "OUTBOUND_DELIVERY_FINALIZATION_FAILED" ||
          error.message === "OUTBOUND_ATTEMPT_CLAIM_LOST")
      ) {
        throw error;
      }
      const attempt = await this.prisma.assistantOutboundAttempt.findUniqueOrThrow({
        where: { id: claim.attemptId },
      });
      if (attempt.result !== "SENDING") {
        throw new Error("OUTBOUND_DELIVERY_FINALIZATION_FAILED");
      }
      const result: OutboundRecoverySendResult = attempt.boundaryStartedAt
        ? {
            status: "UNCERTAIN",
            retrySafety: "RECONCILE_REQUIRED",
            externalMessageId: attempt.externalMessageId,
            httpStatus: null,
            errorClass: "OUTBOUND_RECOVERY_EXCEPTION",
            errorCode: sanitizeTechnicalCode(
              (error as { code?: unknown })?.code,
              "RECOVERY_EXCEPTION_AFTER_BOUNDARY",
            ),
          }
        : {
            status: "FAILED_RETRYABLE",
            retrySafety: "PROVEN_SAFE",
            externalMessageId: null,
            httpStatus: null,
            errorClass: "OUTBOUND_BEFORE_BOUNDARY",
            errorCode: "RECOVERY_EXCEPTION_BEFORE_BOUNDARY",
          };
      delivery = await this.finishClaim({
        deliveryId: delivery.id,
        attemptId: claim.attemptId,
        claimToken: claim.claimToken,
        result,
      });
      this.logger.warn?.(
        `Outbound recovery failed safely: delivery=${delivery.id} status=${delivery.status}`,
      );
      return {
        deliveryId,
        action: "ATTEMPTED",
        status: delivery.status,
        attemptCount: delivery.attemptCount,
      };
    }
  }

  public async runOnce(input: {
    deliveryIds?: string[];
    limit?: number;
  } = {}): Promise<OutboundRecoveryRunResult[]> {
    const deliveries = await this.prisma.assistantOutboundDelivery.findMany({
      where: {
        ...(input.deliveryIds?.length ? { id: { in: input.deliveryIds } } : {}),
        OR: [
          {
            status: {
              in: ["PENDING", "FAILED_RETRYABLE", "SENDING", "UNCERTAIN"],
            },
          },
          {
            status: "ACKNOWLEDGED",
            handoffOperation: {
              is: {
                status: { in: ["REMOTE_CONFIRMED", "CONFIRMATION_PENDING"] },
              },
            },
          },
        ],
      },
      select: { id: true },
      orderBy: [{ nextEligibleAt: "asc" }, { createdAt: "asc" }],
      take: Math.max(1, Math.min(input.limit ?? 50, 100)),
    });
    const results: OutboundRecoveryRunResult[] = [];
    for (const delivery of deliveries) {
      results.push(await this.recoverDelivery(delivery.id));
    }
    return results;
  }
}
