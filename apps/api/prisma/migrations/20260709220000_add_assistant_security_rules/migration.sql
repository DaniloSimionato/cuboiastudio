CREATE TABLE "assistant_security_rules" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "assistantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ruleType" TEXT NOT NULL,
    "instruction" TEXT NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assistant_security_rules_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "assistant_security_rules_companyId_idx" ON "assistant_security_rules"("companyId");
CREATE INDEX "assistant_security_rules_assistantId_idx" ON "assistant_security_rules"("assistantId");
CREATE INDEX "assistant_security_rules_companyId_assistantId_status_idx" ON "assistant_security_rules"("companyId", "assistantId", "status");
CREATE INDEX "assistant_security_rules_companyId_assistantId_sortOrder_idx" ON "assistant_security_rules"("companyId", "assistantId", "sortOrder");

ALTER TABLE "assistant_security_rules"
ADD CONSTRAINT "assistant_security_rules_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "assistant_security_rules"
ADD CONSTRAINT "assistant_security_rules_assistantId_fkey"
FOREIGN KEY ("assistantId") REFERENCES "assistants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
