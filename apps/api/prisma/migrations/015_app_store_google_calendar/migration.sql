CREATE TYPE "AppInstallationStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ERROR');

CREATE TYPE "AppCredentialType" AS ENUM ('OAUTH2', 'API_KEY');

CREATE TYPE "AppActionStatus" AS ENUM ('SUCCESS', 'ERROR');

CREATE TYPE "GoogleCalendarBookingStatus" AS ENUM ('CONFIRMED', 'CANCELLED', 'RESCHEDULED', 'ERROR');

CREATE TABLE "apps" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "apps_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "app_installations" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "status" "AppInstallationStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastErrorCode" TEXT,
    "lastErrorMessage" TEXT,
    "installedByUserId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_installations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "app_credentials" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "installationId" TEXT NOT NULL,
    "type" "AppCredentialType" NOT NULL DEFAULT 'OAUTH2',
    "providerAccountEmail" TEXT,
    "encryptedAccessToken" TEXT,
    "accessTokenIv" TEXT,
    "accessTokenAuthTag" TEXT,
    "encryptedRefreshToken" TEXT,
    "refreshTokenIv" TEXT,
    "refreshTokenAuthTag" TEXT,
    "scopes" TEXT,
    "expiresAt" TIMESTAMP(3),
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_credentials_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "app_action_logs" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "installationId" TEXT,
    "action" TEXT NOT NULL,
    "status" "AppActionStatus" NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_action_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "google_calendar_resources" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "installationId" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "sportType" TEXT NOT NULL,
    "isCovered" BOOLEAN NOT NULL DEFAULT false,
    "timezone" TEXT NOT NULL DEFAULT 'America/Campo_Grande',
    "slotMinutes" INTEGER NOT NULL DEFAULT 30,
    "defaultDurationMinutes" INTEGER NOT NULL DEFAULT 60,
    "minAdvanceMinutes" INTEGER NOT NULL DEFAULT 60,
    "maxDaysAhead" INTEGER NOT NULL DEFAULT 14,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "google_calendar_resources_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "google_calendar_bookings" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "installationId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "googleEventId" TEXT NOT NULL,
    "conversationId" TEXT,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "status" "GoogleCalendarBookingStatus" NOT NULL DEFAULT 'CONFIRMED',
    "createdBy" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "google_calendar_bookings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "apps_slug_key" ON "apps"("slug");
CREATE INDEX "apps_status_idx" ON "apps"("status");

CREATE UNIQUE INDEX "app_installations_companyId_appId_key" ON "app_installations"("companyId", "appId");
CREATE INDEX "app_installations_companyId_idx" ON "app_installations"("companyId");
CREATE INDEX "app_installations_appId_idx" ON "app_installations"("appId");
CREATE INDEX "app_installations_status_idx" ON "app_installations"("status");

CREATE INDEX "app_credentials_companyId_idx" ON "app_credentials"("companyId");
CREATE INDEX "app_credentials_installationId_idx" ON "app_credentials"("installationId");
CREATE INDEX "app_credentials_status_idx" ON "app_credentials"("status");

CREATE INDEX "app_action_logs_companyId_createdAt_idx" ON "app_action_logs"("companyId", "createdAt");
CREATE INDEX "app_action_logs_appId_createdAt_idx" ON "app_action_logs"("appId", "createdAt");
CREATE INDEX "app_action_logs_installationId_createdAt_idx" ON "app_action_logs"("installationId", "createdAt");
CREATE INDEX "app_action_logs_action_idx" ON "app_action_logs"("action");
CREATE INDEX "app_action_logs_status_idx" ON "app_action_logs"("status");

CREATE UNIQUE INDEX "google_calendar_resources_companyId_installationId_calendarId_key" ON "google_calendar_resources"("companyId", "installationId", "calendarId");
CREATE INDEX "google_calendar_resources_companyId_idx" ON "google_calendar_resources"("companyId");
CREATE INDEX "google_calendar_resources_installationId_idx" ON "google_calendar_resources"("installationId");
CREATE INDEX "google_calendar_resources_active_idx" ON "google_calendar_resources"("active");
CREATE INDEX "google_calendar_resources_resourceType_idx" ON "google_calendar_resources"("resourceType");
CREATE INDEX "google_calendar_resources_sportType_idx" ON "google_calendar_resources"("sportType");

CREATE UNIQUE INDEX "google_calendar_bookings_companyId_installationId_googleEventId_key" ON "google_calendar_bookings"("companyId", "installationId", "googleEventId");
CREATE INDEX "google_calendar_bookings_companyId_idx" ON "google_calendar_bookings"("companyId");
CREATE INDEX "google_calendar_bookings_installationId_idx" ON "google_calendar_bookings"("installationId");
CREATE INDEX "google_calendar_bookings_resourceId_idx" ON "google_calendar_bookings"("resourceId");
CREATE INDEX "google_calendar_bookings_conversationId_idx" ON "google_calendar_bookings"("conversationId");
CREATE INDEX "google_calendar_bookings_startAt_idx" ON "google_calendar_bookings"("startAt");
CREATE INDEX "google_calendar_bookings_status_idx" ON "google_calendar_bookings"("status");

ALTER TABLE "app_installations"
ADD CONSTRAINT "app_installations_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "app_installations"
ADD CONSTRAINT "app_installations_appId_fkey"
FOREIGN KEY ("appId") REFERENCES "apps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "app_credentials"
ADD CONSTRAINT "app_credentials_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "app_credentials"
ADD CONSTRAINT "app_credentials_installationId_fkey"
FOREIGN KEY ("installationId") REFERENCES "app_installations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "app_action_logs"
ADD CONSTRAINT "app_action_logs_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "app_action_logs"
ADD CONSTRAINT "app_action_logs_appId_fkey"
FOREIGN KEY ("appId") REFERENCES "apps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "app_action_logs"
ADD CONSTRAINT "app_action_logs_installationId_fkey"
FOREIGN KEY ("installationId") REFERENCES "app_installations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "google_calendar_resources"
ADD CONSTRAINT "google_calendar_resources_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "google_calendar_resources"
ADD CONSTRAINT "google_calendar_resources_installationId_fkey"
FOREIGN KEY ("installationId") REFERENCES "app_installations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "google_calendar_bookings"
ADD CONSTRAINT "google_calendar_bookings_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "google_calendar_bookings"
ADD CONSTRAINT "google_calendar_bookings_installationId_fkey"
FOREIGN KEY ("installationId") REFERENCES "app_installations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "google_calendar_bookings"
ADD CONSTRAINT "google_calendar_bookings_resourceId_fkey"
FOREIGN KEY ("resourceId") REFERENCES "google_calendar_resources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "google_calendar_bookings"
ADD CONSTRAINT "google_calendar_bookings_conversationId_fkey"
FOREIGN KEY ("conversationId") REFERENCES "assistant_conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
