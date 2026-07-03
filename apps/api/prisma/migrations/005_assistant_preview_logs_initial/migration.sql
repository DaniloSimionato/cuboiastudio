-- CreateTable
CREATE TABLE "assistant_preview_logs" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "assistantId" TEXT NOT NULL,
    "userId" TEXT,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "sources" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assistant_preview_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assistant_preview_logs_companyId_idx" ON "assistant_preview_logs"("companyId");

-- CreateIndex
CREATE INDEX "assistant_preview_logs_assistantId_idx" ON "assistant_preview_logs"("assistantId");

-- CreateIndex
CREATE INDEX "assistant_preview_logs_userId_idx" ON "assistant_preview_logs"("userId");

-- CreateIndex
CREATE INDEX "assistant_preview_logs_createdAt_idx" ON "assistant_preview_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "assistant_preview_logs" ADD CONSTRAINT "assistant_preview_logs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistant_preview_logs" ADD CONSTRAINT "assistant_preview_logs_assistantId_fkey" FOREIGN KEY ("assistantId") REFERENCES "assistants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistant_preview_logs" ADD CONSTRAINT "assistant_preview_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
