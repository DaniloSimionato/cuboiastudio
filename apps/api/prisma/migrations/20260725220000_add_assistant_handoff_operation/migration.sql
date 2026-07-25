-- CreateTable
CREATE TABLE "assistant_handoff_operations" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "assistantId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "turnExecutionId" TEXT NOT NULL,
    "decisionId" TEXT NOT NULL,
    "contextVersion" INTEGER NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "expectedControlRevision" INTEGER NOT NULL,
    "postBlockControlRevision" INTEGER,
    "reason" TEXT NOT NULL,
    "destinationType" TEXT NOT NULL DEFAULT 'UNRESOLVED',
    "destinationResolution" TEXT NOT NULL DEFAULT 'UNRESOLVED',
    "destinationAssigneeId" TEXT,
    "destinationTeamId" TEXT,
    "destinationInboxId" TEXT,
    "desiredAiActive" BOOLEAN NOT NULL DEFAULT false,
    "desiredStatus" TEXT,
    "localBlockedAt" TIMESTAMP(3),
    "remoteMutationResult" TEXT,
    "remoteMutationErrorCode" TEXT,
    "remoteVerificationResult" TEXT,
    "remoteVerificationErrorCode" TEXT,
    "observedAiActive" BOOLEAN,
    "observedStatus" TEXT,
    "observedAssigneeId" TEXT,
    "observedTeamId" TEXT,
    "observedAccountId" TEXT,
    "observedInboxId" TEXT,
    "observedConversationId" TEXT,
    "remoteStateFingerprint" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "confirmationAuthorizedAt" TIMESTAMP(3),
    "confirmationDeliveryCreatedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "supersededAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "errorClass" TEXT,
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assistant_handoff_operations_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "assistant_outbound_deliveries"
ADD COLUMN "handoffOperationId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "assistant_handoff_operations_decisionId_key" ON "assistant_handoff_operations"("decisionId");

-- CreateIndex
CREATE UNIQUE INDEX "assistant_handoff_operations_idempotencyKey_key" ON "assistant_handoff_operations"("idempotencyKey");

-- CreateIndex
CREATE INDEX "assistant_handoff_operations_companyId_createdAt_idx" ON "assistant_handoff_operations"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "assistant_handoff_operations_assistantId_createdAt_idx" ON "assistant_handoff_operations"("assistantId", "createdAt");

-- CreateIndex
CREATE INDEX "assistant_handoff_operations_conversationId_createdAt_idx" ON "assistant_handoff_operations"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "assistant_handoff_operations_turnExecutionId_idx" ON "assistant_handoff_operations"("turnExecutionId");

-- CreateIndex
CREATE INDEX "assistant_handoff_operations_status_updatedAt_idx" ON "assistant_handoff_operations"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "assistant_outbound_deliveries_handoffOperationId_idx" ON "assistant_outbound_deliveries"("handoffOperationId");

-- AddForeignKey
ALTER TABLE "assistant_handoff_operations" ADD CONSTRAINT "assistant_handoff_operations_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistant_handoff_operations" ADD CONSTRAINT "assistant_handoff_operations_assistantId_fkey" FOREIGN KEY ("assistantId") REFERENCES "assistants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistant_handoff_operations" ADD CONSTRAINT "assistant_handoff_operations_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "assistant_conversations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistant_outbound_deliveries" ADD CONSTRAINT "assistant_outbound_deliveries_handoffOperationId_fkey" FOREIGN KEY ("handoffOperationId") REFERENCES "assistant_handoff_operations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
