-- CreateTable
CREATE TABLE "assistant_outbound_deliveries" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "assistantId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "assistantMessageId" TEXT NOT NULL,
    "turnExecutionId" TEXT NOT NULL,
    "decisionId" TEXT NOT NULL,
    "blockOrdinal" INTEGER NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "expectedContextVersion" INTEGER NOT NULL,
    "expectedControlRevision" INTEGER NOT NULL,
    "sender" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "payloadSize" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "attemptOwner" TEXT,
    "attemptedAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "externalMessageId" TEXT,
    "errorClass" TEXT,
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assistant_outbound_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "assistant_outbound_deliveries_idempotencyKey_key" ON "assistant_outbound_deliveries"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "assistant_outbound_deliveries_decisionId_blockOrdinal_key" ON "assistant_outbound_deliveries"("decisionId", "blockOrdinal");

-- CreateIndex
CREATE INDEX "assistant_outbound_deliveries_companyId_createdAt_idx" ON "assistant_outbound_deliveries"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "assistant_outbound_deliveries_assistantId_createdAt_idx" ON "assistant_outbound_deliveries"("assistantId", "createdAt");

-- CreateIndex
CREATE INDEX "assistant_outbound_deliveries_conversationId_createdAt_idx" ON "assistant_outbound_deliveries"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "assistant_outbound_deliveries_status_updatedAt_idx" ON "assistant_outbound_deliveries"("status", "updatedAt");

-- AddForeignKey
ALTER TABLE "assistant_outbound_deliveries" ADD CONSTRAINT "assistant_outbound_deliveries_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistant_outbound_deliveries" ADD CONSTRAINT "assistant_outbound_deliveries_assistantId_fkey" FOREIGN KEY ("assistantId") REFERENCES "assistants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistant_outbound_deliveries" ADD CONSTRAINT "assistant_outbound_deliveries_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "assistant_conversations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistant_outbound_deliveries" ADD CONSTRAINT "assistant_outbound_deliveries_assistantMessageId_fkey" FOREIGN KEY ("assistantMessageId") REFERENCES "assistant_conversation_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
