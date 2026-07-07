-- AlterTable
ALTER TABLE "assistant_runtime_logs" ADD COLUMN     "blockReason" TEXT,
ADD COLUMN     "blockedByRule" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "detectedIntent" TEXT,
ADD COLUMN     "handoffTeam" TEXT,
ADD COLUMN     "handoffTriggered" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "intentConfidence" DOUBLE PRECISION,
ADD COLUMN     "selectedFlowId" TEXT,
ADD COLUMN     "selectedFlowName" TEXT,
ADD COLUMN     "toolsUsed" TEXT;

-- CreateTable
CREATE TABLE "assistant_behaviors" (
    "id" TEXT NOT NULL,
    "assistantId" TEXT NOT NULL,
    "attendantName" TEXT,
    "showAttendantName" BOOLEAN NOT NULL DEFAULT true,
    "role" TEXT,
    "howItActs" TEXT,
    "personality" TEXT,
    "toneOfVoice" TEXT,
    "responseStyle" TEXT DEFAULT 'whatsapp',
    "emojiUsage" TEXT DEFAULT 'low',
    "greetingMessage" TEXT,
    "noInventInfo" BOOLEAN NOT NULL DEFAULT true,
    "unknownBehavior" TEXT DEFAULT 'fallback',
    "maxBlockLength" INTEGER DEFAULT 300,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assistant_behaviors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assistant_flows" (
    "id" TEXT NOT NULL,
    "assistantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "triggerKeywords" TEXT,
    "triggerDescription" TEXT,
    "triggerExamples" TEXT,
    "flowInstructions" TEXT,
    "allowedToolSlugs" TEXT,
    "knowledgeScope" TEXT,
    "finalAction" TEXT DEFAULT 'respond',
    "fixedMessage" TEXT,
    "handoffTeamId" TEXT,
    "handoffTeamName" TEXT,
    "chatwootLabels" TEXT,
    "autoRespond" BOOLEAN NOT NULL DEFAULT true,
    "requiresHuman" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assistant_flows_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "assistant_behaviors_assistantId_key" ON "assistant_behaviors"("assistantId");

-- CreateIndex
CREATE INDEX "assistant_behaviors_assistantId_idx" ON "assistant_behaviors"("assistantId");

-- CreateIndex
CREATE INDEX "assistant_flows_assistantId_idx" ON "assistant_flows"("assistantId");

-- CreateIndex
CREATE INDEX "assistant_flows_active_idx" ON "assistant_flows"("active");

-- AddForeignKey
ALTER TABLE "assistant_behaviors" ADD CONSTRAINT "assistant_behaviors_assistantId_fkey" FOREIGN KEY ("assistantId") REFERENCES "assistants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistant_flows" ADD CONSTRAINT "assistant_flows_assistantId_fkey" FOREIGN KEY ("assistantId") REFERENCES "assistants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
