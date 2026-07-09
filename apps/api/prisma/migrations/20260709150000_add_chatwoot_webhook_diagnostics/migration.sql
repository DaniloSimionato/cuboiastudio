ALTER TABLE "chatwoot_inbox_configs"
ADD COLUMN "lastApiTestAt" TIMESTAMP(3),
ADD COLUMN "lastApiTestOk" BOOLEAN,
ADD COLUMN "lastWebhookAt" TIMESTAMP(3),
ADD COLUMN "lastWebhookEvent" TEXT,
ADD COLUMN "lastWebhookAccountId" TEXT,
ADD COLUMN "lastWebhookInboxId" TEXT,
ADD COLUMN "lastWebhookConversationId" TEXT,
ADD COLUMN "lastWebhookMessageType" TEXT,
ADD COLUMN "lastWebhookIgnoredReason" TEXT,
ADD COLUMN "lastWebhookRequestId" TEXT,
ADD COLUMN "lastResponseAt" TIMESTAMP(3);

CREATE TABLE "chatwoot_webhook_diagnostics" (
  "id" TEXT NOT NULL,
  "configId" TEXT,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "event" TEXT,
  "accountId" TEXT,
  "inboxId" TEXT,
  "conversationId" TEXT,
  "messageType" TEXT,
  "ignoredReason" TEXT,
  "requestId" TEXT,

  CONSTRAINT "chatwoot_webhook_diagnostics_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "chatwoot_webhook_diagnostics"
ADD CONSTRAINT "chatwoot_webhook_diagnostics_configId_fkey"
FOREIGN KEY ("configId") REFERENCES "chatwoot_inbox_configs"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "chatwoot_webhook_diagnostics_configId_receivedAt_idx"
ON "chatwoot_webhook_diagnostics"("configId", "receivedAt");

CREATE INDEX "chatwoot_webhook_diagnostics_accountId_inboxId_receivedAt_idx"
ON "chatwoot_webhook_diagnostics"("accountId", "inboxId", "receivedAt");

CREATE INDEX "chatwoot_webhook_diagnostics_receivedAt_idx"
ON "chatwoot_webhook_diagnostics"("receivedAt");
