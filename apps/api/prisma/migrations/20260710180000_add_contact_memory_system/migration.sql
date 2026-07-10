-- CreateEnum
CREATE TYPE "ContactMemoryCategory" AS ENUM ('IDENTITY', 'PREFERENCE', 'BUSINESS_CONTEXT', 'RELATIONSHIP_SUMMARY', 'TEMPORARY_CONTEXT');

-- CreateEnum
CREATE TYPE "ContactMemorySourceType" AS ENUM ('CONTACT_MESSAGE', 'HUMAN_AGENT', 'AI_EXTRACTED', 'WEBHOOK_TOOL', 'GOOGLE_CALENDAR', 'CHATWOOT', 'MANUAL', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ContactMemoryEventType" AS ENUM ('CREATED', 'UPDATED', 'DEACTIVATED', 'REACTIVATED', 'DELETED');

-- AlterTable: Add memory settings to assistants
ALTER TABLE "assistants" ADD COLUMN "memoryEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "assistants" ADD COLUMN "memoryPrePromptEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "assistants" ADD COLUMN "memoryExtractionEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "assistants" ADD COLUMN "memoryAllowedCategories" TEXT;
ALTER TABLE "assistants" ADD COLUMN "memoryConfidenceThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.7;
ALTER TABLE "assistants" ADD COLUMN "memoryTempDefaultDays" INTEGER NOT NULL DEFAULT 7;
ALTER TABLE "assistants" ADD COLUMN "memorySharedAcrossAssistants" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "contact_memory_profiles" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "assistantId" TEXT,
    "identityKey" TEXT NOT NULL,
    "channelType" "ConversationChannelType" NOT NULL DEFAULT 'UNKNOWN',
    "externalAccountId" TEXT,
    "externalContactId" TEXT,
    "externalInboxId" TEXT,
    "chatwootContactId" TEXT,
    "phoneNormalized" TEXT,
    "displayName" TEXT,
    "summary" TEXT,
    "lastInteractionAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_memory_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_memory_items" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "category" "ContactMemoryCategory" NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "valueJson" JSONB,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.9,
    "sourceType" "ContactMemorySourceType" NOT NULL DEFAULT 'CONTACT_MESSAGE',
    "sourceConversationId" TEXT,
    "sourceMessageId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_memory_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_memory_events" (
    "id" TEXT NOT NULL,
    "memoryItemId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "eventType" "ContactMemoryEventType" NOT NULL,
    "previousValue" TEXT,
    "newValue" TEXT,
    "sourceType" "ContactMemorySourceType" NOT NULL DEFAULT 'SYSTEM',
    "sourceConversationId" TEXT,
    "sourceMessageId" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_memory_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contact_memory_profiles_companyId_idx" ON "contact_memory_profiles"("companyId");
CREATE INDEX "contact_memory_profiles_companyId_externalAccountId_idx" ON "contact_memory_profiles"("companyId", "externalAccountId");
CREATE INDEX "contact_memory_profiles_companyId_externalInboxId_idx" ON "contact_memory_profiles"("companyId", "externalInboxId");
CREATE INDEX "contact_memory_profiles_companyId_chatwootContactId_idx" ON "contact_memory_profiles"("companyId", "chatwootContactId");
CREATE INDEX "contact_memory_profiles_companyId_phoneNormalized_idx" ON "contact_memory_profiles"("companyId", "phoneNormalized");
CREATE INDEX "contact_memory_profiles_companyId_assistantId_idx" ON "contact_memory_profiles"("companyId", "assistantId");
CREATE UNIQUE INDEX "contact_memory_profiles_companyId_identityKey_key" ON "contact_memory_profiles"("companyId", "identityKey");

-- CreateIndex
CREATE INDEX "contact_memory_items_companyId_idx" ON "contact_memory_items"("companyId");
CREATE INDEX "contact_memory_items_profileId_idx" ON "contact_memory_items"("profileId");
CREATE INDEX "contact_memory_items_companyId_active_idx" ON "contact_memory_items"("companyId", "active");
CREATE INDEX "contact_memory_items_companyId_deletedAt_idx" ON "contact_memory_items"("companyId", "deletedAt");
CREATE INDEX "contact_memory_items_expiresAt_idx" ON "contact_memory_items"("expiresAt");
CREATE UNIQUE INDEX "contact_memory_items_profileId_category_key_key" ON "contact_memory_items"("profileId", "category", "key");

-- CreateIndex
CREATE INDEX "contact_memory_events_memoryItemId_idx" ON "contact_memory_events"("memoryItemId");
CREATE INDEX "contact_memory_events_companyId_idx" ON "contact_memory_events"("companyId");
CREATE INDEX "contact_memory_events_companyId_createdAt_idx" ON "contact_memory_events"("companyId", "createdAt");

-- AddForeignKey
ALTER TABLE "contact_memory_profiles" ADD CONSTRAINT "contact_memory_profiles_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_memory_items" ADD CONSTRAINT "contact_memory_items_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "contact_memory_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "contact_memory_items" ADD CONSTRAINT "contact_memory_items_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_memory_events" ADD CONSTRAINT "contact_memory_events_memoryItemId_fkey" FOREIGN KEY ("memoryItemId") REFERENCES "contact_memory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "contact_memory_events" ADD CONSTRAINT "contact_memory_events_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
