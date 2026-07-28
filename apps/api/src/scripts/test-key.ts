import { NestFactory } from "@nestjs/core";
import { AppModule } from "../app.module";
import { PrismaService } from "../database/prisma.service";
import { AiSettingsService } from "../ai-settings/ai-settings.service";

const COMPANY_ID = "cmrcu4hdl008yrq01noholvvd";

async function main() {
  console.log("🚀 Loading application context to test API Key...");
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const settingsService = app.get(AiSettingsService);

  try {
    const config = await settingsService.resolveRuntimeConfig(COMPANY_ID);
    console.log("🔍 Resolved config:", {
      runtimeEnabled: config.runtimeEnabled,
      provider: config.provider,
      baseUrl: config.baseUrl,
      model: config.model,
      apiKeyLength: config.apiKey?.length ?? 0,
      apiKeyPrefix: config.apiKey ? config.apiKey.substring(0, 10) + "..." : "none",
    });

    if (!config.apiKey) {
      console.log("❌ No API key configured!");
      return;
    }

    console.log("⚡ Testing OpenAI Key by requesting a dummy embedding...");
    const payload = {
      model: "text-embedding-3-small",
      input: "test",
    };

    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    console.log("HTTP status:", response.status);
    const body = await response.text();
    console.log("Response body:", body);
  } catch (error) {
    console.error("❌ Error testing key:", error);
  } finally {
    await app.close();
  }
}

main().catch(console.error);
