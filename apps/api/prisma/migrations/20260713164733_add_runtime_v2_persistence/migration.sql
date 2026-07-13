-- CreateEnum
CREATE TYPE "RuntimeV2StateMode" AS ENUM ('SHADOW');

-- CreateEnum
CREATE TYPE "RuntimeV2StateEventStatus" AS ENUM ('PROCESSING', 'PROCESSED', 'STALE_CONTEXT', 'STALE_EVENT', 'ERROR');

-- CreateTable
CREATE TABLE "assistant_conversation_states_v2" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "assistantId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "contextVersion" INTEGER NOT NULL,
    "mode" "RuntimeV2StateMode" NOT NULL DEFAULT 'SHADOW',
    "schemaVersion" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "stateJson" JSONB NOT NULL,
    "lastProcessedMessageId" TEXT,
    "lastProcessedExternalMessageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "purgeAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assistant_conversation_states_v2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assistant_conversation_state_v2_events" (
    "id" TEXT NOT NULL,
    "stateId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "assistantId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "contextVersion" INTEGER NOT NULL,
    "internalMessageId" TEXT NOT NULL,
    "externalMessageId" TEXT,
    "sourceOccurredAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "resultingRevision" INTEGER,
    "status" "RuntimeV2StateEventStatus" NOT NULL DEFAULT 'PROCESSING',
    "errorCode" TEXT,
    "messageHash" TEXT,

    CONSTRAINT "assistant_conversation_state_v2_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assistant_conversation_states_v2_companyId_idx" ON "assistant_conversation_states_v2"("companyId");

-- CreateIndex
CREATE INDEX "assistant_conversation_states_v2_assistantId_idx" ON "assistant_conversation_states_v2"("assistantId");

-- CreateIndex
CREATE INDEX "assistant_conversation_states_v2_conversationId_idx" ON "assistant_conversation_states_v2"("conversationId");

-- CreateIndex
CREATE INDEX "assistant_conversation_states_v2_expiresAt_idx" ON "assistant_conversation_states_v2"("expiresAt");

-- CreateIndex
CREATE INDEX "assistant_conversation_states_v2_purgeAt_idx" ON "assistant_conversation_states_v2"("purgeAt");

-- CreateIndex
CREATE INDEX "assistant_conversation_states_v2_updatedAt_idx" ON "assistant_conversation_states_v2"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "assistant_conversation_states_v2_companyId_assistantId_conv_key" ON "assistant_conversation_states_v2"("companyId", "assistantId", "conversationId", "contextVersion", "mode");

-- CreateIndex
CREATE UNIQUE INDEX "assistant_conversation_state_v2_events_internalMessageId_key" ON "assistant_conversation_state_v2_events"("internalMessageId");

-- CreateIndex
CREATE INDEX "assistant_conversation_state_v2_events_stateId_idx" ON "assistant_conversation_state_v2_events"("stateId");

-- CreateIndex
CREATE INDEX "assistant_conversation_state_v2_events_companyId_idx" ON "assistant_conversation_state_v2_events"("companyId");

-- CreateIndex
CREATE INDEX "assistant_conversation_state_v2_events_conversationId_idx" ON "assistant_conversation_state_v2_events"("conversationId");

-- CreateIndex
CREATE INDEX "assistant_conversation_state_v2_events_contextVersion_idx" ON "assistant_conversation_state_v2_events"("contextVersion");

-- CreateIndex
CREATE INDEX "assistant_conversation_state_v2_events_processedAt_idx" ON "assistant_conversation_state_v2_events"("processedAt");

-- CreateIndex
CREATE INDEX "assistant_conversation_state_v2_events_status_idx" ON "assistant_conversation_state_v2_events"("status");

-- AddForeignKey
ALTER TABLE "assistant_conversation_states_v2" ADD CONSTRAINT "assistant_conversation_states_v2_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistant_conversation_states_v2" ADD CONSTRAINT "assistant_conversation_states_v2_assistantId_fkey" FOREIGN KEY ("assistantId") REFERENCES "assistants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistant_conversation_states_v2" ADD CONSTRAINT "assistant_conversation_states_v2_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "assistant_conversations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistant_conversation_state_v2_events" ADD CONSTRAINT "assistant_conversation_state_v2_events_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "assistant_conversation_states_v2"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistant_conversation_state_v2_events" ADD CONSTRAINT "assistant_conversation_state_v2_events_internalMessageId_fkey" FOREIGN KEY ("internalMessageId") REFERENCES "assistant_conversation_messages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistant_conversation_state_v2_events" ADD CONSTRAINT "assistant_conversation_state_v2_events_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistant_conversation_state_v2_events" ADD CONSTRAINT "assistant_conversation_state_v2_events_assistantId_fkey" FOREIGN KEY ("assistantId") REFERENCES "assistants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistant_conversation_state_v2_events" ADD CONSTRAINT "assistant_conversation_state_v2_events_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "assistant_conversations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Keep persisted V2 state bounded and structurally valid at the database boundary.
ALTER TABLE "assistant_conversation_states_v2"
  ADD CONSTRAINT "assistant_conversation_states_v2_revision_nonnegative_check"
  CHECK ("revision" >= 0),
  ADD CONSTRAINT "assistant_conversation_states_v2_context_version_nonnegative_check"
  CHECK ("contextVersion" >= 0),
  ADD CONSTRAINT "assistant_conversation_states_v2_state_json_size_check"
  CHECK (pg_column_size("stateJson") <= 65536);
