ALTER TABLE "companies"
ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo';

ALTER TABLE "assistants"
ADD COLUMN "businessCity" TEXT,
ADD COLUMN "businessState" TEXT,
ADD COLUMN "businessPostalCode" TEXT,
ADD COLUMN "businessPhone" TEXT,
ADD COLUMN "businessWhatsapp" TEXT,
ADD COLUMN "businessWhatsappSupport" TEXT,
ADD COLUMN "websiteUrl" TEXT,
ADD COLUMN "timezone" TEXT;
