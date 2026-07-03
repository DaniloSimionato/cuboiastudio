-- CreateTable
CREATE TABLE "assistant_runtime_logs" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "assistantId" TEXT,
    "conversationId" TEXT,
    "userMessageId" TEXT,
    "assistantMessageId" TEXT,
    "mode" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "provider" TEXT,
    "model" TEXT,
    "configurationSource" TEXT,
    "fallback" BOOLEAN NOT NULL DEFAULT false,
    "fallbackReason" TEXT,
    "outcome" TEXT,
    "durationMs" INTEGER,
    "providerStatus" INTEGER,
    "providerErrorType" TEXT,
    "providerErrorCode" TEXT,
    "providerErrorMessage" TEXT,
    "knowledgeCount" INTEGER,
    "historyMessagesUsed" INTEGER,
    "historyLimit" INTEGER,
    "initialMessageIncluded" BOOLEAN NOT NULL DEFAULT false,
    "instructionsIncluded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assistant_runtime_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assistant_runtime_logs_companyId_createdAt_idx" ON "assistant_runtime_logs"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "assistant_runtime_logs_assistantId_createdAt_idx" ON "assistant_runtime_logs"("assistantId", "createdAt");

-- CreateIndex
CREATE INDEX "assistant_runtime_logs_conversationId_idx" ON "assistant_runtime_logs"("conversationId");

-- AddForeignKey
ALTER TABLE "assistant_runtime_logs" ADD CONSTRAINT "assistant_runtime_logs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistant_runtime_logs" ADD CONSTRAINT "assistant_runtime_logs_assistantId_fkey" FOREIGN KEY ("assistantId") REFERENCES "assistants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
