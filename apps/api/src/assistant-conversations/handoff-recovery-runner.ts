import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AssistantConversationsService } from "./assistant-conversations.service";

export const HANDOFF_RECOVERY_RUNNER_SCHEMA_VERSION = "HANDOFF_RECOVERY_RUNNER_V1";
export const DEFAULT_HANDOFF_RECOVERY_INTERVAL_MS = 60_000;
export const DEFAULT_HANDOFF_RECOVERY_BATCH_LIMIT = 25;

export type HandoffRecoveryRunnerResult =
  | "COMPLETED"
  | "DISABLED"
  | "BLOCKED_ENVIRONMENT"
  | "SKIPPED_OVERLAP"
  | "SHUTTING_DOWN"
  | "FAILED";

type HandoffRecoveryServicePort = {
  runHandoffRecoveryOnce?: (input?: {
    operationIds?: string[];
    limit?: number;
  }) => Promise<unknown>;
};

type HandoffRecoveryRunnerConfiguration = Readonly<{
  schemaVersion: typeof HANDOFF_RECOVERY_RUNNER_SCHEMA_VERSION;
  enabled: boolean;
  environment: string;
  automaticExecutionAllowed: boolean;
  intervalMs: number;
  batchLimit: number;
}>;

function isLockedDownEnvironment(environment: string): boolean {
  return environment === "staging" || environment === "production";
}

export function resolveHandoffRecoveryRunnerConfiguration(
  configService: Pick<ConfigService, "get">,
): HandoffRecoveryRunnerConfiguration {
  const environment = configService.get<string>("NODE_ENV") ?? "development";
  const enabled = configService.get<boolean>("HANDOFF_RECOVERY_ENABLED") === true;
  const intervalMs =
    configService.get<number>("HANDOFF_RECOVERY_INTERVAL_MS") ??
    DEFAULT_HANDOFF_RECOVERY_INTERVAL_MS;
  const batchLimit =
    configService.get<number>("HANDOFF_RECOVERY_BATCH_LIMIT") ??
    DEFAULT_HANDOFF_RECOVERY_BATCH_LIMIT;

  return Object.freeze({
    schemaVersion: HANDOFF_RECOVERY_RUNNER_SCHEMA_VERSION,
    enabled,
    environment,
    automaticExecutionAllowed: enabled && !isLockedDownEnvironment(environment),
    intervalMs,
    batchLimit,
  });
}

@Injectable()
export class HandoffRecoveryRunner
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(HandoffRecoveryRunner.name);
  private readonly configuration: HandoffRecoveryRunnerConfiguration;
  private interval: NodeJS.Timeout | null = null;
  private inFlight: Promise<HandoffRecoveryRunnerResult> | null = null;
  private shuttingDown = false;

  constructor(
    configService: ConfigService,
    private readonly assistantConversationsService: AssistantConversationsService,
  ) {
    this.configuration = resolveHandoffRecoveryRunnerConfiguration(configService);
  }

  public onApplicationBootstrap(): void {
    if (!this.configuration.enabled) {
      this.logger.log("Handoff recovery runner is disabled.");
      return;
    }
    if (!this.configuration.automaticExecutionAllowed) {
      this.logger.warn(
        `Handoff recovery runner is blocked in ${this.configuration.environment}.`,
      );
      return;
    }
    const recoveryService =
      this.assistantConversationsService as AssistantConversationsService &
        HandoffRecoveryServicePort;
    if (typeof recoveryService.runHandoffRecoveryOnce !== "function") {
      throw new Error("HANDOFF_RECOVERY_COORDINATOR_UNAVAILABLE");
    }

    this.interval = setInterval(() => {
      void this.runOnce();
    }, this.configuration.intervalMs);
    this.interval.unref?.();
  }

  public async onApplicationShutdown(): Promise<void> {
    this.shuttingDown = true;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    if (this.inFlight) {
      await this.inFlight;
    }
  }

  public isScheduled(): boolean {
    return this.interval !== null;
  }

  public async runOnce(): Promise<HandoffRecoveryRunnerResult> {
    if (!this.configuration.enabled) return "DISABLED";
    if (!this.configuration.automaticExecutionAllowed) return "BLOCKED_ENVIRONMENT";
    if (this.shuttingDown) return "SHUTTING_DOWN";
    if (this.inFlight) return "SKIPPED_OVERLAP";

    const recoveryService =
      this.assistantConversationsService as AssistantConversationsService &
        HandoffRecoveryServicePort;
    if (typeof recoveryService.runHandoffRecoveryOnce !== "function") {
      this.logger.error("Handoff recovery coordinator is unavailable.");
      return "FAILED";
    }

    const execution = (async (): Promise<HandoffRecoveryRunnerResult> => {
      try {
        await recoveryService.runHandoffRecoveryOnce({
          limit: this.configuration.batchLimit,
        });
        return "COMPLETED";
      } catch (error) {
        const message = error instanceof Error ? error.message : "unknown error";
        this.logger.error(`Handoff recovery run failed safely: ${message}`);
        return "FAILED";
      }
    })();
    this.inFlight = execution;
    try {
      return await execution;
    } finally {
      if (this.inFlight === execution) {
        this.inFlight = null;
      }
    }
  }
}
