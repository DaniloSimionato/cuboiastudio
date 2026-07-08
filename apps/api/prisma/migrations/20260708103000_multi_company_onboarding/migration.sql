ALTER TABLE "companies"
ADD COLUMN "legalName" TEXT,
ADD COLUMN "notes" TEXT;

ALTER TABLE "users"
ADD COLUMN "activeCompanyId" TEXT;

UPDATE "users"
SET "activeCompanyId" = "companyId"
WHERE "activeCompanyId" IS NULL;

CREATE TABLE "company_memberships" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_memberships_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "company_memberships_userId_companyId_key"
ON "company_memberships"("userId", "companyId");

INSERT INTO "company_memberships" ("id", "userId", "companyId", "status", "createdAt", "updatedAt")
SELECT
    CONCAT('membership_', "id", '_', "companyId"),
    "id",
    "companyId",
    'ACTIVE'::"Status",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "users"
ON CONFLICT ("userId", "companyId") DO NOTHING;

CREATE INDEX "company_memberships_userId_idx" ON "company_memberships"("userId");
CREATE INDEX "company_memberships_companyId_idx" ON "company_memberships"("companyId");
CREATE INDEX "company_memberships_status_idx" ON "company_memberships"("status");
CREATE INDEX "users_activeCompanyId_idx" ON "users"("activeCompanyId");

ALTER TABLE "users"
ADD CONSTRAINT "users_activeCompanyId_fkey"
FOREIGN KEY ("activeCompanyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "company_memberships"
ADD CONSTRAINT "company_memberships_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "company_memberships"
ADD CONSTRAINT "company_memberships_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
