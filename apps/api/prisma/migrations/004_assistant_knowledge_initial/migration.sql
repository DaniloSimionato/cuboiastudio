-- CreateTable
CREATE TABLE "assistant_knowledge" (
    "id" TEXT NOT NULL,
    "assistantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assistant_knowledge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assistant_knowledge_companyId_idx" ON "assistant_knowledge"("companyId");

-- CreateIndex
CREATE INDEX "assistant_knowledge_assistantId_idx" ON "assistant_knowledge"("assistantId");

-- CreateIndex
CREATE INDEX "assistant_knowledge_status_idx" ON "assistant_knowledge"("status");

-- CreateIndex
CREATE INDEX "assistant_knowledge_updatedAt_idx" ON "assistant_knowledge"("updatedAt");

-- AddForeignKey
ALTER TABLE "assistant_knowledge" ADD CONSTRAINT "assistant_knowledge_assistantId_fkey" FOREIGN KEY ("assistantId") REFERENCES "assistants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistant_knowledge" ADD CONSTRAINT "assistant_knowledge_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
