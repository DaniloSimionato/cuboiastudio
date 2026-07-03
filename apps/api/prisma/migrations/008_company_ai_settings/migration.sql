-- CreateTable
CREATE TABLE "company_ai_settings" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "runtimeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "provider" TEXT NOT NULL DEFAULT 'openai-compatible',
    "baseUrl" TEXT,
    "model" TEXT,
    "encryptedApiKey" TEXT,
    "apiKeyIv" TEXT,
    "apiKeyAuthTag" TEXT,
    "requestTimeoutMs" INTEGER NOT NULL DEFAULT 30000,
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "lastTestAt" TIMESTAMP(3),
    "lastTestStatus" TEXT,
    "lastTestError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_ai_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "company_ai_settings_companyId_key" ON "company_ai_settings"("companyId");

-- CreateIndex
CREATE INDEX "company_ai_settings_companyId_idx" ON "company_ai_settings"("companyId");

-- AddForeignKey
ALTER TABLE "company_ai_settings" ADD CONSTRAINT "company_ai_settings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
