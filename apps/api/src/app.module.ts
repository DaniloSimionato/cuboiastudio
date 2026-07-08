import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { Logger as PinoLogger, LoggerModule } from "nestjs-pino";
import { randomUUID } from "node:crypto";
import { APP_NAME } from "./app.constants";
import { AuthModule } from "./auth/auth.module";
import { AssistantConversationsModule } from "./assistant-conversations/assistant-conversations.module";
import { AssistantKnowledgeModule } from "./assistant-knowledge/assistant-knowledge.module";
import { AssistantRuntimeLogsModule } from "./assistant-runtime-logs/assistant-runtime-logs.module";
import { DatabaseModule } from "./database/database.module";
import { AssistantsModule } from "./assistants/assistants.module";
import { AssistantBehaviorsModule } from "./assistant-behaviors/assistant-behaviors.module";
import { AssistantFlowsModule } from "./assistant-flows/assistant-flows.module";
import { PromptCompilerModule } from "./prompt-compiler/prompt-compiler.module";
import { IntentRouterModule } from "./intent-router/intent-router.module";
import { AppsModule } from "./apps/apps.module";
import { AiSettingsModule } from "./ai-settings/ai-settings.module";
import { DiagnosticsModule } from "./diagnostics/diagnostics.module";
import { HealthModule } from "./health/health.module";
import { CompaniesModule } from "./companies/companies.module";
import { WebhooksModule } from "./webhooks/webhooks.module";
import { validateEnvironment } from "./config/env";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: [".env", "../.env", "../../.env"],
      validate: validateEnvironment,
    }),
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        pinoHttp: {
          level: configService.get<string>("LOG_LEVEL") ?? "info",
          genReqId: (req) =>
            (req.headers["x-request-id"] as string | undefined)?.trim() ||
            (req.headers["x-correlation-id"] as string | undefined)?.trim() ||
            randomUUID(),
          redact: {
            paths: [
              "req.headers.authorization",
              "req.headers.cookie",
              "req.headers.x-auth-signature",
              "req.headers.x-dev-user-id",
              "req.headers.x-dev-user-email",
              "req.headers.x-dev-company-id",
            ],
            remove: true,
          },
          customProps: () => ({
            service: APP_NAME,
          }),
        },
      }),
    }),
    AuthModule,
    AiSettingsModule,
    AssistantConversationsModule,
    AssistantKnowledgeModule,
    AssistantRuntimeLogsModule,
    AppsModule,
    DatabaseModule,
    AssistantsModule,
    AssistantBehaviorsModule,
    AssistantFlowsModule,
    PromptCompilerModule,
    IntentRouterModule,
    CompaniesModule,
    DiagnosticsModule,
    HealthModule,
    WebhooksModule,
  ],
})
export class AppModule {}

export { PinoLogger };
