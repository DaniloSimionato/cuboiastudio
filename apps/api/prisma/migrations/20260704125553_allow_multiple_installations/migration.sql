-- DropIndex
DROP INDEX "app_installations_companyId_appId_key";

-- CreateIndex
CREATE INDEX "app_installations_companyId_appId_idx" ON "app_installations"("companyId", "appId");
