-- AlterTable
ALTER TABLE "apps" ADD COLUMN     "availability" TEXT NOT NULL DEFAULT 'AVAILABLE',
ADD COLUMN     "category" TEXT,
ADD COLUMN     "icon" TEXT,
ADD COLUMN     "isFeatured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "google_calendar_resources" ADD COLUMN     "attributeId" TEXT,
ADD COLUMN     "categoryId" TEXT,
ADD COLUMN     "resourceTypeId" TEXT;

-- CreateTable
CREATE TABLE "reservable_resource_types" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reservable_resource_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservable_resource_categories" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reservable_resource_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservable_resource_attributes" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reservable_resource_attributes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reservable_resource_types_companyId_idx" ON "reservable_resource_types"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "reservable_resource_types_companyId_slug_key" ON "reservable_resource_types"("companyId", "slug");

-- CreateIndex
CREATE INDEX "reservable_resource_categories_companyId_idx" ON "reservable_resource_categories"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "reservable_resource_categories_companyId_slug_key" ON "reservable_resource_categories"("companyId", "slug");

-- CreateIndex
CREATE INDEX "reservable_resource_attributes_companyId_idx" ON "reservable_resource_attributes"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "reservable_resource_attributes_companyId_slug_key" ON "reservable_resource_attributes"("companyId", "slug");

-- CreateIndex
CREATE INDEX "assistant_conversations_source_idx" ON "assistant_conversations"("source");

-- CreateIndex
CREATE INDEX "assistant_conversations_channelType_idx" ON "assistant_conversations"("channelType");

-- CreateIndex
CREATE INDEX "google_calendar_resources_resourceTypeId_idx" ON "google_calendar_resources"("resourceTypeId");

-- CreateIndex
CREATE INDEX "google_calendar_resources_categoryId_idx" ON "google_calendar_resources"("categoryId");

-- CreateIndex
CREATE INDEX "google_calendar_resources_attributeId_idx" ON "google_calendar_resources"("attributeId");

-- AddForeignKey
ALTER TABLE "google_calendar_resources" ADD CONSTRAINT "google_calendar_resources_resourceTypeId_fkey" FOREIGN KEY ("resourceTypeId") REFERENCES "reservable_resource_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "google_calendar_resources" ADD CONSTRAINT "google_calendar_resources_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "reservable_resource_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "google_calendar_resources" ADD CONSTRAINT "google_calendar_resources_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "reservable_resource_attributes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservable_resource_types" ADD CONSTRAINT "reservable_resource_types_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservable_resource_categories" ADD CONSTRAINT "reservable_resource_categories_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservable_resource_attributes" ADD CONSTRAINT "reservable_resource_attributes_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "assistant_conversation_messages_companyId_source_externalMessag" RENAME TO "assistant_conversation_messages_companyId_source_externalMe_key";

-- RenameIndex
ALTER INDEX "assistant_conversations_companyId_assistantId_externalAccountId" RENAME TO "assistant_conversations_companyId_assistantId_externalAccou_key";

-- RenameIndex
ALTER INDEX "google_calendar_bookings_companyId_installationId_googleEventId" RENAME TO "google_calendar_bookings_companyId_installationId_googleEve_key";

-- RenameIndex
ALTER INDEX "google_calendar_resources_companyId_installationId_calendarId_k" RENAME TO "google_calendar_resources_companyId_installationId_calendar_key";
