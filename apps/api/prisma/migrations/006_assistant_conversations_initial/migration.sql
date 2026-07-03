-- CreateTable
CREATE TABLE "assistant_conversations" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "assistantId" TEXT NOT NULL,
    "userId" TEXT,
    "title" TEXT,
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assistant_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assistant_conversation_messages" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "assistantId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sources" JSONB,
    "mode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assistant_conversation_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assistant_conversations_companyId_idx" ON "assistant_conversations"("companyId");

-- CreateIndex
CREATE INDEX "assistant_conversations_assistantId_idx" ON "assistant_conversations"("assistantId");

-- CreateIndex
CREATE INDEX "assistant_conversations_createdAt_idx" ON "assistant_conversations"("createdAt");

-- CreateIndex
CREATE INDEX "assistant_conversations_updatedAt_idx" ON "assistant_conversations"("updatedAt");

-- CreateIndex
CREATE INDEX "assistant_conversation_messages_companyId_idx" ON "assistant_conversation_messages"("companyId");

-- CreateIndex
CREATE INDEX "assistant_conversation_messages_assistantId_idx" ON "assistant_conversation_messages"("assistantId");

-- CreateIndex
CREATE INDEX "assistant_conversation_messages_conversationId_idx" ON "assistant_conversation_messages"("conversationId");

-- CreateIndex
CREATE INDEX "assistant_conversation_messages_createdAt_idx" ON "assistant_conversation_messages"("createdAt");

-- AddForeignKey
ALTER TABLE "assistant_conversations" ADD CONSTRAINT "assistant_conversations_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistant_conversations" ADD CONSTRAINT "assistant_conversations_assistantId_fkey" FOREIGN KEY ("assistantId") REFERENCES "assistants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistant_conversations" ADD CONSTRAINT "assistant_conversations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistant_conversation_messages" ADD CONSTRAINT "assistant_conversation_messages_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistant_conversation_messages" ADD CONSTRAINT "assistant_conversation_messages_assistantId_fkey" FOREIGN KEY ("assistantId") REFERENCES "assistants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistant_conversation_messages" ADD CONSTRAINT "assistant_conversation_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "assistant_conversations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
