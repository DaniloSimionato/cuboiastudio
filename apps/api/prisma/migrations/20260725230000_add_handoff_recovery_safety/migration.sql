-- AlterTable
ALTER TABLE "assistant_handoff_operations"
ADD COLUMN "maxAttempts" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN "userMessageId" TEXT,
ADD COLUMN "runtimeLogId" TEXT,
ADD COLUMN "confirmationMessageId" TEXT,
ADD COLUMN "recoverySchemaVersion" TEXT NOT NULL DEFAULT 'ASSISTANT_HANDOFF_RECOVERY_V1',
ADD COLUMN "recoverySafety" TEXT NOT NULL DEFAULT 'UNKNOWN',
ADD COLUMN "attemptOwner" TEXT,
ADD COLUMN "claimStartedAt" TIMESTAMP(3),
ADD COLUMN "claimExpiresAt" TIMESTAMP(3),
ADD COLUMN "nextEligibleAt" TIMESTAMP(3),
ADD COLUMN "remoteBoundaryStartedAt" TIMESTAMP(3),
ADD COLUMN "reconciliationStatus" TEXT,
ADD COLUMN "reconciliationEvidenceType" TEXT,
ADD COLUMN "reconciledAt" TIMESTAMP(3),
ADD COLUMN "recoveryBlockedReason" TEXT,
ADD COLUMN "externalInterventionObserved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "externalInterventionAt" TIMESTAMP(3),
ADD COLUMN "confirmationContractVersion" TEXT NOT NULL DEFAULT 'OPERATIONAL_HANDOFF_CONFIRMATION_V1';

-- CreateTable
CREATE TABLE "assistant_handoff_attempts" (
    "id" TEXT NOT NULL,
    "operationId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "owner" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "leaseExpiresAt" TIMESTAMP(3) NOT NULL,
    "boundaryStartedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "result" TEXT NOT NULL DEFAULT 'CLAIMED',
    "recoverySafety" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "mutationResult" TEXT,
    "verificationResult" TEXT,
    "httpStatus" INTEGER,
    "observedStateFingerprint" TEXT,
    "errorClass" TEXT,
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assistant_handoff_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assistant_handoff_operations_status_nextEligibleAt_idx" ON "assistant_handoff_operations"("status", "nextEligibleAt");

-- CreateIndex
CREATE UNIQUE INDEX "assistant_handoff_attempts_operationId_attemptNumber_key" ON "assistant_handoff_attempts"("operationId", "attemptNumber");

-- CreateIndex
CREATE INDEX "assistant_handoff_attempts_operationId_createdAt_idx" ON "assistant_handoff_attempts"("operationId", "createdAt");

-- CreateIndex
CREATE INDEX "assistant_handoff_attempts_result_updatedAt_idx" ON "assistant_handoff_attempts"("result", "updatedAt");

-- AddForeignKey
ALTER TABLE "assistant_handoff_attempts" ADD CONSTRAINT "assistant_handoff_attempts_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "assistant_handoff_operations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
