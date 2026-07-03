ALTER TYPE "GoogleCalendarBookingStatus" ADD VALUE 'FAILED';

ALTER TABLE "google_calendar_bookings"
ADD COLUMN "contactPhoneNormalized" TEXT,
ADD COLUMN "source" TEXT NOT NULL DEFAULT 'ai_tool',
ADD COLUMN "idempotencyKey" TEXT,
ADD COLUMN "cancelledAt" TIMESTAMP(3),
ADD COLUMN "rescheduledFromBookingId" TEXT;

CREATE UNIQUE INDEX "google_calendar_bookings_companyId_idempotencyKey_key"
ON "google_calendar_bookings"("companyId", "idempotencyKey");

CREATE INDEX "google_calendar_bookings_contactPhoneNormalized_idx"
ON "google_calendar_bookings"("contactPhoneNormalized");
