-- AlterTable
ALTER TABLE "assistant_conversation_messages" ADD COLUMN     "contextVersion" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "assistant_conversations" ADD COLUMN     "currentContextVersion" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "assistants" ADD COLUMN     "conversationResetConfirmationMessage" TEXT NOT NULL DEFAULT '🔄 Atendimento reiniciado. Mantive as informações importantes já registradas e comecei uma nova sessão. Como posso ajudar?',
ADD COLUMN     "conversationResetEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "conversationResetKeywords" TEXT[] DEFAULT ARRAY['reset']::TEXT[],
ADD COLUMN     "conversationResetPreserveMemories" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "conversationResetSendInitialMessage" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "assistant_conversation_sessions" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "assistant_id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "context_version" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "reset_reason" TEXT,
    "reset_message_id" TEXT,
    "summary" TEXT,
    "memory_extraction_status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assistant_conversation_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assistant_conversation_sessions_company_id_idx" ON "assistant_conversation_sessions"("company_id");

-- CreateIndex
CREATE INDEX "assistant_conversation_sessions_assistant_id_idx" ON "assistant_conversation_sessions"("assistant_id");

-- CreateIndex
CREATE INDEX "assistant_conversation_sessions_conversation_id_idx" ON "assistant_conversation_sessions"("conversation_id");

-- AddForeignKey
ALTER TABLE "assistant_conversation_sessions" ADD CONSTRAINT "assistant_conversation_sessions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistant_conversation_sessions" ADD CONSTRAINT "assistant_conversation_sessions_assistant_id_fkey" FOREIGN KEY ("assistant_id") REFERENCES "assistants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistant_conversation_sessions" ADD CONSTRAINT "assistant_conversation_sessions_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "assistant_conversations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
