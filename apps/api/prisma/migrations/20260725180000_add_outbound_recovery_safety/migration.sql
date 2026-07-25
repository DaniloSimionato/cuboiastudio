-- AlterTable
ALTER TABLE "assistant_outbound_deliveries"
ADD COLUMN "payloadContractVersion" TEXT NOT NULL DEFAULT 'V1_LEGACY_UNVERIFIED',
ADD COLUMN "handoff" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "retrySafety" TEXT NOT NULL DEFAULT 'UNKNOWN',
ADD COLUMN "maxAttempts" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN "claimStartedAt" TIMESTAMP(3),
ADD COLUMN "claimExpiresAt" TIMESTAMP(3),
ADD COLUMN "nextEligibleAt" TIMESTAMP(3),
ADD COLUMN "reconciliationStatus" TEXT,
ADD COLUMN "reconciliationEvidenceType" TEXT,
ADD COLUMN "reconciledAt" TIMESTAMP(3),
ADD COLUMN "recoveryBlockedReason" TEXT;

-- CreateTable
CREATE TABLE "assistant_outbound_attempts" (
    "id" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "owner" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "leaseExpiresAt" TIMESTAMP(3) NOT NULL,
    "boundaryStartedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "result" TEXT NOT NULL DEFAULT 'SENDING',
    "retrySafety" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "httpStatus" INTEGER,
    "externalMessageId" TEXT,
    "errorClass" TEXT,
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assistant_outbound_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "assistant_outbound_attempts_deliveryId_attemptNumber_key" ON "assistant_outbound_attempts"("deliveryId", "attemptNumber");

-- CreateIndex
CREATE INDEX "assistant_outbound_attempts_deliveryId_startedAt_idx" ON "assistant_outbound_attempts"("deliveryId", "startedAt");

-- CreateIndex
CREATE INDEX "assistant_outbound_attempts_owner_idx" ON "assistant_outbound_attempts"("owner");

-- CreateIndex
CREATE INDEX "assistant_outbound_attempts_result_leaseExpiresAt_idx" ON "assistant_outbound_attempts"("result", "leaseExpiresAt");

-- AddForeignKey
ALTER TABLE "assistant_outbound_attempts" ADD CONSTRAINT "assistant_outbound_attempts_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "assistant_outbound_deliveries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
