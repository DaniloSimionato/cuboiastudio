-- CreateTable
CREATE TABLE "assistants" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assistants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assistants_companyId_idx" ON "assistants"("companyId");

-- CreateIndex
CREATE INDEX "assistants_status_idx" ON "assistants"("status");

-- CreateIndex
CREATE INDEX "assistants_updatedAt_idx" ON "assistants"("updatedAt");

-- AddForeignKey
ALTER TABLE "assistants" ADD CONSTRAINT "assistants_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
