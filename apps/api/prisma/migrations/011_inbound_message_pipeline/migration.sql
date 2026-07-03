ALTER TABLE "assistant_conversations"
ADD COLUMN "sourceProvider" TEXT,
ADD COLUMN "externalConversationId" TEXT,
ADD COLUMN "externalContactId" TEXT,
ADD COLUMN "externalChannelId" TEXT,
ADD COLUMN "externalInboxId" TEXT,
ADD COLUMN "pausedByHuman" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "lastMessageAt" TIMESTAMP(3);

ALTER TABLE "assistant_conversation_messages"
ADD COLUMN "source" TEXT,
ADD COLUMN "messageType" TEXT,
ADD COLUMN "externalMessageId" TEXT,
ADD COLUMN "externalPayload" JSONB,
ADD COLUMN "attachments" JSONB;

CREATE INDEX "assistant_conversations_externalConversationId_idx" ON "assistant_conversations"("externalConversationId");
CREATE INDEX "assistant_conversations_externalChannelId_idx" ON "assistant_conversations"("externalChannelId");
CREATE INDEX "assistant_conversation_messages_externalMessageId_idx" ON "assistant_conversation_messages"("externalMessageId");
