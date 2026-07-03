ALTER TABLE "app_credentials"
ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'google',
ADD COLUMN "connectedAt" TIMESTAMP(3),
ADD COLUMN "lastRefreshAt" TIMESTAMP(3);

CREATE INDEX "app_credentials_provider_idx" ON "app_credentials"("provider");
