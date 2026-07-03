ALTER TABLE "assistant_conversations"
ADD COLUMN "externalAccountId" TEXT;

CREATE TABLE "chatwoot_inbox_configs" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "inboxId" TEXT NOT NULL,
    "apiAccessTokenEncrypted" TEXT,
    "apiAccessTokenIv" TEXT,
    "apiAccessTokenAuthTag" TEXT,
    "webhookSecretEncrypted" TEXT,
    "webhookSecretIv" TEXT,
    "webhookSecretAuthTag" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chatwoot_inbox_configs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "chatwoot_inbox_configs_companyId_accountId_inboxId_key" ON "chatwoot_inbox_configs"("companyId", "accountId", "inboxId");
CREATE INDEX "chatwoot_inbox_configs_companyId_idx" ON "chatwoot_inbox_configs"("companyId");
CREATE INDEX "chatwoot_inbox_configs_accountId_idx" ON "chatwoot_inbox_configs"("accountId");
CREATE INDEX "chatwoot_inbox_configs_inboxId_idx" ON "chatwoot_inbox_configs"("inboxId");
CREATE INDEX "chatwoot_inbox_configs_isActive_idx" ON "chatwoot_inbox_configs"("isActive");

ALTER TABLE "chatwoot_inbox_configs"
ADD CONSTRAINT "chatwoot_inbox_configs_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "assistant_conversations_companyId_assistantId_externalAccountId_externalConversationId_key"
ON "assistant_conversations"("companyId", "assistantId", "externalAccountId", "externalConversationId");

CREATE INDEX "assistant_conversations_externalAccountId_idx" ON "assistant_conversations"("externalAccountId");

CREATE UNIQUE INDEX "assistant_conversation_messages_companyId_source_externalMessageId_key"
ON "assistant_conversation_messages"("companyId", "source", "externalMessageId");
