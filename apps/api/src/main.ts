import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import type { NextFunction, Request, Response } from "express";
import { AppModule, PinoLogger } from "./app.module";
import { APP_NAME, APP_VERSION, DEFAULT_CORS_ORIGIN, DEFAULT_PORT } from "./app.constants";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";

function createCorsOriginResolver(rawOrigin: string | undefined) {
  const configuredOrigins = rawOrigin
    ? rawOrigin
        .split(",")
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
    : [];

  const localhostOriginPattern = /^http:\/\/localhost:\d+$/;
  const loopbackOriginPattern = /^http:\/\/127\.0\.0\.1:\d+$/;

  const isAllowedOrigin = (origin: string) => {
    if (process.env.NODE_ENV === "production") {
      const allowedOrigins =
        configuredOrigins.length > 0 ? configuredOrigins : [DEFAULT_CORS_ORIGIN];
      return allowedOrigins.includes(origin);
    }

    const allowedOrigins = configuredOrigins.length > 0 ? configuredOrigins : [DEFAULT_CORS_ORIGIN];
    return (
      allowedOrigins.includes(origin) ||
      localhostOriginPattern.test(origin) ||
      loopbackOriginPattern.test(origin)
    );
  };

  return (
    origin: string | undefined,
    callback: (error: Error | null, allow?: boolean | string) => void,
  ) => {
    if (!origin) {
      callback(null, true);
      return;
    }

    if (isAllowedOrigin(origin)) {
      callback(null, origin);
      return;
    }

    callback(null, false);
  };
}

function maskUrl(rawUrl: string | undefined): string {
  if (!rawUrl?.trim()) {
    return "not-configured";
  }

  try {
    const url = new URL(rawUrl);
    if (url.username) {
      url.username = "***";
    }
    if (url.password) {
      url.password = "***";
    }
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return "configured-invalid-url";
  }
}

function resolveEffectiveCorsOrigin(rawOrigin: string | undefined): string {
  if (rawOrigin?.trim()) {
    return rawOrigin
      .split(",")
      .map((value) => value.trim())
      .filter((value) => value.length > 0)
      .join(",");
  }

  if (process.env.NODE_ENV === "production") {
    return DEFAULT_CORS_ORIGIN;
  }

  return `${DEFAULT_CORS_ORIGIN}, http://localhost:<any>, http://127.0.0.1:<any>`;
}

function buildStartupDiagnostics(port: number) {
  return {
    nodeEnv: process.env.NODE_ENV ?? "development",
    port,
    corsOrigin: resolveEffectiveCorsOrigin(process.env.CORS_ORIGIN),
    databaseUrl: maskUrl(process.env.DATABASE_URL),
    redisUrl: maskUrl(process.env.REDIS_URL),
  };
}

function isPortInUseError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "EADDRINUSE"
  );
}

function formatBootstrapError(error: unknown, port: number): Error {
  if (isPortInUseError(error)) {
    return new Error(
      `Porta ${port} já está em uso. Rode: npm run api:port para ver o processo ou npm run api:kill para liberar.`,
    );
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error("Falha inesperada ao iniciar a API.");
}

async function bootstrap(): Promise<void> {
  const port = Number(process.env.PORT ?? DEFAULT_PORT);
  const startupDiagnostics = buildStartupDiagnostics(port);

  console.info("[api:startup] starting", startupDiagnostics);

  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });
  const logger = app.get(PinoLogger);

  app.enableShutdownHooks();
  app.useLogger(logger);
  logger.log(startupDiagnostics, "API bootstrap configuration");
  app.enableCors({
    origin: createCorsOriginResolver(process.env.CORS_ORIGIN),
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS", "PUT", "HEAD"],
    allowedHeaders: [
      "content-type",
      "authorization",
      "x-dev-user-id",
      "x-dev-company-id",
      "x-dev-user-email",
      "x-request-id",
      "x-correlation-id",
      "x-chatwoot-webhook-secret",
    ],
  });
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }

    next();
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter(app.get(PinoLogger)));

  const swaggerConfig = new DocumentBuilder()
    .setTitle(APP_NAME)
    .setDescription("Foundation API for Cubo AI Studio")
    .setVersion(APP_VERSION)
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("docs", app, document);

  await app.listen(port);
  logger.log({ ...startupDiagnostics, address: await app.getUrl() }, "API bootstrap completed");
}

bootstrap().catch((error: unknown) => {
  const port = Number(process.env.PORT ?? DEFAULT_PORT);
  const formattedError = formatBootstrapError(error, port);
  console.error(formattedError.message);

  if (process.env.NODE_ENV !== "production" && error instanceof Error && error !== formattedError) {
    console.error(error);
  }

  process.exit(1);
});
