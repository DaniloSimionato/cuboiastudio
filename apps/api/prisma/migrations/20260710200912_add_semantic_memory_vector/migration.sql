-- CreateExtension
CREATE EXTENSION IF NOT EXISTS vector;

-- AlterTable
ALTER TABLE "assistants" ADD COLUMN     "semanticMemoryEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "semanticMemoryMaxCandidates" INTEGER NOT NULL DEFAULT 20,
ADD COLUMN     "semanticMemoryMaxResults" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "semanticMemoryThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.7;

-- AlterTable
ALTER TABLE "company_memberships" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "contact_memory_items" ADD COLUMN     "contentHash" TEXT,
ADD COLUMN     "embeddedAt" TIMESTAMP(3),
ADD COLUMN     "embedding" vector(1536),
ADD COLUMN     "embeddingError" TEXT,
ADD COLUMN     "embeddingModel" TEXT,
ADD COLUMN     "embeddingStatus" TEXT DEFAULT 'PENDING',
ADD COLUMN     "embeddingVersion" TEXT;
