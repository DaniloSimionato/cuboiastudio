import { INestApplication, Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaClient } from "@prisma/client";
import { InjectPinoLogger, PinoLogger } from "nestjs-pino";

const DEFAULT_DATABASE_QUERY_TIMEOUT_MS = 5_000;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly isDevelopment: boolean;

  constructor(
    @InjectPinoLogger(PrismaService.name) private readonly logger: PinoLogger,
    configService: ConfigService,
  ) {
    const databaseUrl = configService.get<string>("DATABASE_URL");
    const isDevelopment = configService.get<string>("NODE_ENV") === "development";

    if (!databaseUrl) {
      throw new Error("DATABASE_URL is required to initialize PrismaService");
    }

    super({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
      log: isDevelopment
        ? [{ emit: "event", level: "error" }]
        : [{ emit: "event", level: "error" }],
    });

    this.isDevelopment = isDevelopment;
  }

  async onModuleInit(): Promise<void> {
    if (this.isDevelopment) {
      this.logger.debug("Prisma client will connect lazily on first query");
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.isDevelopment) {
      this.logger.debug("Disconnecting Prisma client");
    }

    await this.$disconnect();
  }

  withQueryTimeout<T>(
    operation: Promise<T>,
    context = "database query",
    timeoutMs = DEFAULT_DATABASE_QUERY_TIMEOUT_MS,
  ): Promise<T> {
    let timeoutId: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`${context} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    return Promise.race([operation, timeout]).finally(() => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    });
  }

  enableShutdownHooks(app: INestApplication): void {
    app.enableShutdownHooks();
  }
}
