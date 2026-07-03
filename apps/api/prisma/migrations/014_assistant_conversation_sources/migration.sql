CREATE TYPE "ConversationSource" AS ENUM ('UNKNOWN', 'MANUAL_TEST', 'CHATWOOT', 'SMOKE', 'SYSTEM');

CREATE TYPE "ConversationChannelType" AS ENUM ('UNKNOWN', 'WHATSAPP', 'INSTAGRAM', 'WEBCHAT');

ALTER TABLE "assistant_conversations"
ADD COLUMN "source" "ConversationSource" NOT NULL DEFAULT 'UNKNOWN',
ADD COLUMN "channelType" "ConversationChannelType" NOT NULL DEFAULT 'UNKNOWN';

UPDATE "assistant_conversations" AS conversation
SET "source" = 'SMOKE'
FROM "assistants" AS assistant
WHERE conversation."assistantId" = assistant."id"
  AND conversation."source" = 'UNKNOWN'
  AND (
    assistant."name" LIKE '[SMOKE]%'
    OR assistant."name" LIKE '[SMOKE:%'
    OR assistant."name" LIKE 'Assistente Smoke Test%'
    OR COALESCE(conversation."title", '') LIKE '[SMOKE]%'
    OR COALESCE(conversation."title", '') LIKE '[SMOKE:%'
    OR COALESCE(conversation."title", '') LIKE 'Assistente Smoke Test%'
  );

UPDATE "assistant_conversations"
SET "source" = 'CHATWOOT'
WHERE "source" = 'UNKNOWN'
  AND (
    LOWER(COALESCE("sourceProvider", '')) = 'chatwoot'
    OR "externalConversationId" IS NOT NULL
    OR "externalAccountId" IS NOT NULL
    OR "externalInboxId" IS NOT NULL
    OR "externalContactId" IS NOT NULL
    OR "externalChannelId" IS NOT NULL
  );

UPDATE "assistant_conversations"
SET "source" = 'MANUAL_TEST'
WHERE "source" = 'UNKNOWN'
  AND "userId" IS NOT NULL
  AND "externalConversationId" IS NULL
  AND "externalAccountId" IS NULL
  AND "externalInboxId" IS NULL
  AND "externalContactId" IS NULL
  AND "externalChannelId" IS NULL;

UPDATE "assistant_conversations" AS conversation
SET "channelType" = 'WHATSAPP'
WHERE conversation."source" = 'CHATWOOT'
  AND conversation."channelType" = 'UNKNOWN'
  AND (
    LOWER(COALESCE(conversation."title", '')) LIKE '%whatsapp%'
    OR LOWER(COALESCE(conversation."externalChannelId", '')) LIKE '%whatsapp%'
    OR LOWER(COALESCE(conversation."externalInboxId", '')) LIKE '%whatsapp%'
    OR EXISTS (
      SELECT 1
      FROM "assistant_conversation_messages" AS message
      WHERE message."conversationId" = conversation."id"
        AND (
          NULLIF(message."externalPayload"->>'externalSenderPhone', '') IS NOT NULL
          OR NULLIF(message."externalPayload"->'contact'->>'phone', '') IS NOT NULL
        )
    )
  );
