import { Injectable, Logger, Optional } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { createHash } from "node:crypto";
import { PrismaService } from "../database/prisma.service";
import { isRuntimeV2ShadowEnabled, resolveRuntimeV2Mode } from "./runtime-v2-feature-flag";
import {
  RuntimeV2ShadowOrchestrator,
  type RuntimeV2ShadowResult,
  type RuntimeV2ShadowSnapshot,
} from "./runtime-v2-shadow-orchestrator";
import type { RuntimeV2ShadowManifest } from "./runtime-v2-shadow-manifest";

export type RuntimeV2ShadowIntegrationStatus =
  | "COMPLETED"
  | "SKIPPED_OFF"
  | "SKIPPED_NOT_ALLOWLISTED"
  | "SKIPPED_INVALID_INPUT"
  | "ALREADY_PROCESSED"
  | "TIMEOUT"
  | "CAPACITY_EXCEEDED"
  | "FAILED";

export type RuntimeV2ShadowIntegrationResult = {
  status: RuntimeV2ShadowIntegrationStatus;
  manifest: RuntimeV2ShadowManifest | null;
  logId: string | null;
  logPersisted: boolean;
};

const SHADOW_LOG_MODE = "runtime-v2-shadow";
const MAX_ERROR_CODE_LENGTH = 80;

function safeErrorCode(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  return value
    .trim()
    .replace(/[^A-Za-z0-9_.:-]/g, "_")
    .slice(0, MAX_ERROR_CODE_LENGTH);
}

function hashMessage(value: string | undefined): string | null {
  if (!value?.trim()) return null;
  return createHash("sha256").update(value).digest("hex");
}

function integrationKey(snapshot: RuntimeV2ShadowSnapshot): string {
  return [
    snapshot.scope.companyId,
    snapshot.scope.assistantId,
    snapshot.scope.conversationId,
    snapshot.scope.contextVersion,
    snapshot.internalMessageId,
  ].join(":");
}

function scopeKey(snapshot: RuntimeV2ShadowSnapshot): string {
  return [
    "V2",
    "SHADOW",
    snapshot.scope.companyId,
    snapshot.scope.assistantId,
    snapshot.scope.conversationId,
    snapshot.scope.contextVersion,
  ]
    .map((value) => encodeURIComponent(String(value)))
    .join(":");
}

function isValidSnapshot(
  snapshot: RuntimeV2ShadowSnapshot | null | undefined,
): snapshot is RuntimeV2ShadowSnapshot {
  return Boolean(
    snapshot?.scope.companyId?.trim() &&
    snapshot.scope.assistantId?.trim() &&
    snapshot.scope.conversationId?.trim() &&
    Number.isInteger(snapshot.scope.contextVersion) &&
    snapshot.scope.contextVersion >= 0 &&
    snapshot.internalMessageId?.trim() &&
    typeof snapshot.currentMessage === "string",
  );
}

function classifyResult(result: RuntimeV2ShadowResult): RuntimeV2ShadowIntegrationStatus {
  const manifest = result.manifest;
  if (!manifest) return "FAILED";
  if (manifest.messageAlreadyProcessed || manifest.persistenceResult === "DUPLICATE") {
    return "ALREADY_PROCESSED";
  }
  if (manifest.shadowErrorCode === "SHADOW_TIMEOUT") return "TIMEOUT";
  if (manifest.shadowErrorCode === "SHADOW_CAPACITY_EXCEEDED") {
    return "CAPACITY_EXCEEDED";
  }
  if (manifest.shadowErrorCode || manifest.validationResult === "ERROR") return "FAILED";
  return "COMPLETED";
}

@Injectable()
export class RuntimeV2ShadowIntegrationService {
  private readonly logger = new Logger(RuntimeV2ShadowIntegrationService.name);
  private readonly pending = new Set<Promise<RuntimeV2ShadowIntegrationResult>>();
  private readonly inFlight = new Set<string>();
  private readonly scopeTails = new Map<string, Promise<void>>();
  private readonly scheduledMessages = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly orchestrator: RuntimeV2ShadowOrchestrator,
    @Optional() private readonly environment?: NodeJS.ProcessEnv,
  ) {}

  schedule(
    snapshot: RuntimeV2ShadowSnapshot | null | undefined,
  ): Promise<RuntimeV2ShadowIntegrationResult> {
    if (!isValidSnapshot(snapshot)) {
      return this.process(snapshot);
    }

    const messageKey = integrationKey(snapshot);
    if (this.scheduledMessages.has(messageKey)) {
      return Promise.resolve({
        status: "ALREADY_PROCESSED",
        manifest: null,
        logId: null,
        logPersisted: false,
      });
    }

    this.scheduledMessages.add(messageKey);
    const sessionKey = scopeKey(snapshot);
    const previous = this.scopeTails.get(sessionKey) ?? Promise.resolve();
    const task = previous
      .catch(() => undefined)
      .then(() => this.process(snapshot))
      .finally(() => {
        this.scheduledMessages.delete(messageKey);
      });
    const tail = task.then(
      () => undefined,
      () => undefined,
    );
    this.scopeTails.set(sessionKey, tail);
    void tail.then(() => {
      if (this.scopeTails.get(sessionKey) === tail) {
        this.scopeTails.delete(sessionKey);
      }
    });

    this.pending.add(task);
    void task.then(
      () => this.pending.delete(task),
      () => this.pending.delete(task),
    );
    return task;
  }

  async drain(): Promise<void> {
    for (;;) {
      const pending = [...this.pending];
      if (pending.length > 0) {
        await Promise.allSettled(pending);
        continue;
      }

      // Allow a fire-and-forget schedule that was started by the current
      // event-loop turn to register its promise before declaring the queue
      // drained. This method is only a deterministic test hook.
      await new Promise<void>((resolve) => setImmediate(resolve));
      if (this.pending.size === 0) return;
    }
  }

  private async process(
    snapshot: RuntimeV2ShadowSnapshot | null | undefined,
  ): Promise<RuntimeV2ShadowIntegrationResult> {
    if (!isValidSnapshot(snapshot)) {
      return { status: "SKIPPED_INVALID_INPUT", manifest: null, logId: null, logPersisted: false };
    }

    const environment = this.environment ?? process.env;
    const mode = resolveRuntimeV2Mode({}, environment);
    if (mode === "OFF") {
      return { status: "SKIPPED_OFF", manifest: null, logId: null, logPersisted: false };
    }
    if (!isRuntimeV2ShadowEnabled({ assistantId: snapshot.scope.assistantId }, environment)) {
      return {
        status: "SKIPPED_NOT_ALLOWLISTED",
        manifest: null,
        logId: null,
        logPersisted: false,
      };
    }

    const key = integrationKey(snapshot);
    if (this.inFlight.has(key)) {
      return {
        status: "ALREADY_PROCESSED",
        manifest: null,
        logId: null,
        logPersisted: false,
      };
    }

    this.inFlight.add(key);
    try {
      const result = await this.orchestrator.process(snapshot);
      const status = classifyResult(result);
      const logId = await this.persistResult(snapshot, result, status);
      return { status, manifest: result.manifest, logId, logPersisted: Boolean(logId) };
    } catch (error) {
      const status: RuntimeV2ShadowIntegrationStatus = "FAILED";
      const logId = await this.persistResult(snapshot, null, status, error);
      return { status, manifest: null, logId, logPersisted: Boolean(logId) };
    } finally {
      this.inFlight.delete(key);
    }
  }

  private async persistResult(
    snapshot: RuntimeV2ShadowSnapshot,
    result: RuntimeV2ShadowResult | null,
    status: RuntimeV2ShadowIntegrationStatus,
    error?: unknown,
  ): Promise<string | null> {
    const manifest = result?.manifest ?? null;
    const shadowErrorCode = safeErrorCode(manifest?.shadowErrorCode ?? errorCode(error));
    const metadata = {
      eventType: "RUNTIME_V2_SHADOW",
      runtimeVersion: "V2",
      mode: "SHADOW",
      correlationId: snapshot.correlationId,
      companyId: snapshot.scope.companyId,
      assistantId: snapshot.scope.assistantId,
      conversationId: snapshot.scope.conversationId,
      contextVersion: snapshot.scope.contextVersion,
      internalMessageId: snapshot.internalMessageId,
      externalMessageId: snapshot.externalMessageId ?? null,
      currentMessageHash: manifest?.currentMessageHash ?? hashMessage(snapshot.currentMessage),
      status,
      revisionBefore: manifest?.revisionBefore ?? null,
      revisionAfter: manifest?.revisionAfter ?? null,
      turnIntent: manifest?.turnIntent ?? null,
      intentConfidence: manifest?.intentConfidence ?? null,
      objectiveAction: manifest?.objectiveAction ?? null,
      previousObjective: manifest?.previousObjective ?? null,
      currentObjective: manifest?.currentObjective ?? null,
      confirmedFactKeysAdded: manifest?.confirmedFactKeysAdded ?? [],
      confirmedFactKeysUpdated: manifest?.confirmedFactKeysUpdated ?? [],
      confirmedFactKeysPreserved: manifest?.confirmedFactKeysPreserved ?? [],
      pendingFieldKeys: manifest?.pendingFieldKeys ?? [],
      lastRelevantQuestionKey: manifest?.lastRelevantQuestionKey ?? null,
      lastRelevantQuestionContextVersion: manifest?.lastRelevantQuestionContextVersion ?? null,
      lastRelevantQuestionUpdated: manifest?.lastRelevantQuestionUpdated ?? false,
      lastRelevantQuestionUpdateReason: manifest?.lastRelevantQuestionUpdateReason ?? "UNCHANGED",
      customerUnableToAnswer: manifest?.customerUnableToAnswer ?? false,
      retrievalPlanCategories: manifest?.retrievalPlanCategories ?? [],
      authorityCategoriesRequested: manifest?.authorityCategoriesRequested ?? [],
      authorityCategoriesAvailable: manifest?.authorityCategoriesAvailable ?? [],
      authorityCategoriesMissing: manifest?.authorityCategoriesMissing ?? [],
      authorityConflictDetected: manifest?.authorityConflictDetected ?? false,
      authorityConflictCategories: manifest?.authorityConflictCategories ?? [],
      winningSourceTypes: manifest?.winningSourceTypes ?? [],
      rejectedSourceTypes: manifest?.rejectedSourceTypes ?? [],
      responsePlanAction: manifest?.responsePlanAction ?? null,
      validationResult: manifest?.validationResult ?? null,
      repeatedQuestionDetected: manifest?.repeatedQuestionDetected ?? false,
      v1SelectedIntent: manifest?.v1Comparison.selectedIntent ?? null,
      v1SelectedFlowId: manifest?.v1Comparison.selectedFlowId ?? null,
      v1TriageMode: manifest?.v1Comparison.triageMode ?? null,
      v1ToolsExposed: manifest?.v1Comparison.toolsExposed ?? [],
      persistenceResult: manifest?.persistenceResult ?? null,
      processingDurationMs: manifest?.processingDurationMs ?? null,
      errorCode: shadowErrorCode,
      providerCalled: false,
      toolCalls: 0,
      outboundSent: false,
    } satisfies Prisma.InputJsonValue;

    try {
      const log = await this.prisma.assistantRuntimeLog.create({
        data: {
          companyId: snapshot.scope.companyId,
          assistantId: snapshot.scope.assistantId,
          conversationId: snapshot.scope.conversationId,
          userMessageId: snapshot.internalMessageId,
          assistantMessageId: null,
          mode: SHADOW_LOG_MODE,
          status,
          provider: null,
          model: null,
          configurationSource: "runtime-v2-shadow",
          fallback: false,
          fallbackReason: null,
          outcome: status === "COMPLETED" ? "shadow_completed" : `shadow_${status.toLowerCase()}`,
          durationMs: manifest?.processingDurationMs ?? null,
          providerStatus: null,
          providerErrorType: null,
          providerErrorCode: shadowErrorCode,
          providerErrorMessage: null,
          knowledgeCount: null,
          historyMessagesUsed: null,
          historyLimit: null,
          initialMessageIncluded: false,
          instructionsIncluded: false,
          detectedIntent: manifest?.turnIntent ?? null,
          selectedFlowId: manifest?.v1Comparison.selectedFlowId ?? null,
          selectedFlowName: null,
          intentConfidence: manifest?.intentConfidence ?? null,
          metadata,
        },
        select: { id: true },
      });
      return log.id;
    } catch (logError) {
      this.logger.warn({
        event: "runtime_v2_shadow_log_failed",
        companyId: snapshot.scope.companyId,
        assistantId: snapshot.scope.assistantId,
        conversationId: snapshot.scope.conversationId,
        internalMessageId: snapshot.internalMessageId,
        errorCode: safeErrorCode(errorCode(logError)),
      });
      return null;
    }
  }
}

function errorCode(error: unknown): string | null {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return `PRISMA_${error.code}`;
  }
  if (error instanceof Error && /^[A-Z][A-Z0-9_.:-]{2,79}$/.test(error.name)) {
    return error.name;
  }
  if (error instanceof Error && error.constructor?.name === "PrismaClientKnownRequestError") {
    return "PRISMA_KNOWN_REQUEST_ERROR";
  }
  if (error instanceof Error && /^[A-Za-z][A-Za-z0-9_.:-]{2,79}$/.test(error.message.trim())) {
    return error.message.trim();
  }
  if (error instanceof Error) return "SHADOW_INTEGRATION_ERROR";
  if (error != null) return "SHADOW_INTEGRATION_ERROR";
  return null;
}
