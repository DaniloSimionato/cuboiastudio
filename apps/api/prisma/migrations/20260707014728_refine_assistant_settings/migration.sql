-- AlterTable
ALTER TABLE "assistant_conversations" ADD COLUMN     "aiActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lastAiActiveAt" TIMESTAMP(3),
ADD COLUMN     "lastAiPausedAt" TIMESTAMP(3),
ADD COLUMN     "lastExternalMessageId" TEXT,
ADD COLUMN     "lastResumeRunAt" TIMESTAMP(3),
ADD COLUMN     "pauseReason" TEXT,
ADD COLUMN     "resumeReason" TEXT;

-- AlterTable
ALTER TABLE "assistants" ADD COLUMN     "aiAlwaysAvailable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "avoidPhrases" TEXT,
ADD COLUMN     "businessAddress" TEXT,
ADD COLUMN     "businessCityRegion" TEXT,
ADD COLUMN     "messageBufferEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "messageBufferSeconds" INTEGER NOT NULL DEFAULT 6,
ADD COLUMN     "personality" TEXT,
ADD COLUMN     "splitResponseEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "splitResponseStyle" TEXT,
ADD COLUMN     "toneOfVoice" TEXT,
ADD COLUMN     "weeklySchedule" JSONB;
