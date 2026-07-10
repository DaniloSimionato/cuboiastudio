-- CreateTable
CREATE TABLE "assistant_tool_configs" (
    "id" TEXT NOT NULL,
    "assistantId" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "toolName" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "permissionType" TEXT NOT NULL DEFAULT 'READ',
    "requiresConfirmation" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assistant_tool_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_webhook_actions" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "installationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "descriptionAdmin" TEXT,
    "descriptionAi" TEXT,
    "method" TEXT NOT NULL DEFAULT 'GET',
    "url" TEXT NOT NULL,
    "headers" JSONB,
    "authType" TEXT,
    "authConfig" JSONB,
    "bodyTemplate" TEXT,
    "parameterSchema" JSONB,
    "timeoutMs" INTEGER NOT NULL DEFAULT 5000,
    "permissionType" TEXT NOT NULL DEFAULT 'READ',
    "requiresConfirmation" BOOLEAN NOT NULL DEFAULT false,
    "responseFilter" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_webhook_actions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "assistant_tool_configs_assistantId_appId_toolName_key" ON "assistant_tool_configs"("assistantId", "appId", "toolName");

-- CreateIndex
CREATE INDEX "custom_webhook_actions_installationId_idx" ON "custom_webhook_actions"("installationId");

-- CreateIndex
CREATE UNIQUE INDEX "custom_webhook_actions_companyId_name_key" ON "custom_webhook_actions"("companyId", "name");

-- AddForeignKey
ALTER TABLE "assistant_tool_configs" ADD CONSTRAINT "assistant_tool_configs_assistantId_fkey" FOREIGN KEY ("assistantId") REFERENCES "assistants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistant_tool_configs" ADD CONSTRAINT "assistant_tool_configs_appId_fkey" FOREIGN KEY ("appId") REFERENCES "apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_webhook_actions" ADD CONSTRAINT "custom_webhook_actions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_webhook_actions" ADD CONSTRAINT "custom_webhook_actions_installationId_fkey" FOREIGN KEY ("installationId") REFERENCES "app_installations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
