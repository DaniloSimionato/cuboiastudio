ALTER TABLE "chatwoot_inbox_configs"
ADD COLUMN "assistantId" TEXT;

CREATE INDEX "chatwoot_inbox_configs_assistantId_idx" ON "chatwoot_inbox_configs"("assistantId");

ALTER TABLE "chatwoot_inbox_configs"
ADD CONSTRAINT "chatwoot_inbox_configs_assistantId_fkey"
FOREIGN KEY ("assistantId") REFERENCES "assistants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
