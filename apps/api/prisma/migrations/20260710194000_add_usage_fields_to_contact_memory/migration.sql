-- AlterTable
ALTER TABLE "contact_memory_items" ADD COLUMN "usageCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "lastUsedAt" TIMESTAMP(3);
