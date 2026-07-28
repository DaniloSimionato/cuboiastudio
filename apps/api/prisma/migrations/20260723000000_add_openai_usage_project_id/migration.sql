-- OpenAI project used to scope official Usage and Costs API data to one tenant.
ALTER TABLE "company_ai_settings" ADD COLUMN "openAiProjectId" TEXT;
