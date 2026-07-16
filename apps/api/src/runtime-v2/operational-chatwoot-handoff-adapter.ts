import { createHash } from "node:crypto";
import type { PrismaService } from "../database/prisma.service";
import {
  ChatwootInboxConfigService,
  type ResolvedChatwootInboxConfig,
} from "../chatwoot/chatwoot-inbox-config.service";
import {
  ChatwootHandoffAdapterError,
  type ChatwootHandoffAdapter,
  type ChatwootHandoffAdapterContext,
  type ChatwootHandoffConversationState,
  type ChatwootHandoffExecutionResult,
  ControlledChatwootHandoffExecutor,
  validateChatwootHandoffExecutionPreconditions,
} from "./chatwoot-handoff-executor";
import {
  resolveRuntimeV2HandoffAdapterMode,
  type RuntimeV2HandoffAdapterMode,
} from "./runtime-v2-feature-flag";
import type { HandoffRequest, HandoffStateScope } from "./handoff-state";

export type ChatwootHandoffHttpMethod = "GET" | "PUT";

export type ChatwootHandoffHttpTransport = (input: string, init?: RequestInit) => Promise<Response>;

export type OperationalChatwootHandoffAdapterOptions = {
  fetchImpl?: ChatwootHandoffHttpTransport;
  timeoutMs?: number;
  now?: () => Date;
};

type OperationalChatwootContext = {
  config: ResolvedChatwootInboxConfig;
  externalConversationId: string;
  externalAccountId: string;
  externalInboxId: string;
};

type ChatwootConversationRecord = {
  externalConversationId: string | null;
  externalAccountId: string | null;
  externalInboxId: string | null;
};

function hashMetadata(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function readObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function readIdentifier(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function readAiActive(payload: Record<string, unknown>): boolean | null {
  const customAttributes = readObject(payload.custom_attributes);
  const additionalAttributes = readObject(payload.additional_attributes);
  const meta = readObject(payload.meta);
  return (
    readBoolean(payload.ai_active) ??
    readBoolean(customAttributes.ai_active) ??
    readBoolean(additionalAttributes.ai_active) ??
    readBoolean(meta.ai_active)
  );
}

function readExternalScope(payload: Record<string, unknown>): {
  accountId: string | null;
  inboxId: string | null;
} {
  const meta = readObject(payload.meta);
  const account = readObject(meta.account);
  const inbox = readObject(meta.inbox);
  return {
    accountId:
      readIdentifier(payload.account_id) ??
      readIdentifier(account.id) ??
      readIdentifier(meta.account_id),
    inboxId:
      readIdentifier(payload.inbox_id) ?? readIdentifier(inbox.id) ?? readIdentifier(meta.inbox_id),
  };
}

function readHumanActive(payload: Record<string, unknown>): boolean {
  const customAttributes = readObject(payload.custom_attributes);
  const additionalAttributes = readObject(payload.additional_attributes);
  const meta = readObject(payload.meta);
  return Boolean(
    readBoolean(payload.human_active) ??
    readBoolean(customAttributes.human_active) ??
    readBoolean(additionalAttributes.human_active) ??
    readBoolean(meta.human_active),
  );
}

function readPresence(payload: Record<string, unknown>, key: string): boolean {
  const meta = readObject(payload.meta);
  return Boolean(payload[key] ?? meta[key]);
}

function readConversationStatus(payload: Record<string, unknown>): string | null {
  return typeof payload.status === "string" && payload.status.trim()
    ? payload.status.trim().toUpperCase()
    : null;
}

export class OperationalChatwootHandoffAdapter implements ChatwootHandoffAdapter {
  private readonly fetchImpl: ChatwootHandoffHttpTransport;
  private readonly timeoutMs: number;
  private readonly now: () => Date;

  constructor(
    private readonly prisma: PrismaService,
    private readonly chatwootInboxConfigService: ChatwootInboxConfigService,
    options: OperationalChatwootHandoffAdapterOptions = {},
  ) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 5000;
    this.now = options.now ?? (() => new Date());
  }

  async getConversationState(
    context: ChatwootHandoffAdapterContext,
  ): Promise<ChatwootHandoffConversationState> {
    const resolved = await this.resolveContext(context);
    const payload = await this.requestJson(
      resolved,
      "GET",
      null,
      "CHATWOOT_CONVERSATION_READ_FAILED",
    );
    return this.toConversationState(resolved, payload, context);
  }

  async pauseAi(context: ChatwootHandoffAdapterContext): Promise<void> {
    const current = context.conversationState;
    if (!current || current.conversationExists === false || current.aiActive === undefined) {
      throw new ChatwootHandoffAdapterError("CHATWOOT_CONVERSATION_READ_FAILED", "BEFORE_MUTATION");
    }
    if (!current.accountScopeValid || !current.inboxScopeValid) {
      throw new ChatwootHandoffAdapterError("CHATWOOT_SCOPE_MISMATCH", "BEFORE_MUTATION");
    }
    if (current.humanActive) {
      throw new ChatwootHandoffAdapterError("CHATWOOT_HUMAN_ALREADY_ACTIVE", "BEFORE_MUTATION");
    }
    if (!current.aiActive) return;

    const resolved = await this.resolveContext(context);
    await this.requestJson(resolved, "PUT", { ai_active: false }, "CHATWOOT_PAUSE_AI_FAILED");
  }

  async verifyFinalState(
    context: ChatwootHandoffAdapterContext,
  ): Promise<ChatwootHandoffConversationState> {
    return this.getConversationState(context);
  }

  async reconcile(
    context: ChatwootHandoffAdapterContext,
  ): Promise<ChatwootHandoffConversationState> {
    return this.getConversationState(context);
  }

  async applyLabel(): Promise<void> {
    throw new ChatwootHandoffAdapterError("OPERATION_NOT_ENABLED", "BEFORE_MUTATION");
  }

  async assignTeam(): Promise<void> {
    throw new ChatwootHandoffAdapterError("OPERATION_NOT_ENABLED", "BEFORE_MUTATION");
  }

  async assignAgent(): Promise<void> {
    throw new ChatwootHandoffAdapterError("OPERATION_NOT_ENABLED", "BEFORE_MUTATION");
  }

  private async resolveContext(
    context: ChatwootHandoffAdapterContext,
  ): Promise<OperationalChatwootContext> {
    const record = await this.prisma.assistantConversation.findFirst({
      where: {
        id: context.plan.conversationId,
        companyId: context.plan.companyId,
        assistantId: context.plan.assistantId,
        source: "CHATWOOT",
      },
      select: {
        externalConversationId: true,
        externalAccountId: true,
        externalInboxId: true,
      },
    });
    const conversation = record as ChatwootConversationRecord | null;
    if (
      !conversation?.externalConversationId ||
      !conversation.externalAccountId ||
      !conversation.externalInboxId
    ) {
      throw new ChatwootHandoffAdapterError("CHATWOOT_CONVERSATION_NOT_FOUND", "BEFORE_MUTATION");
    }

    let config: ResolvedChatwootInboxConfig | null;
    try {
      config = await this.chatwootInboxConfigService.resolveActiveForAssistantConversation({
        companyId: context.plan.companyId,
        assistantId: context.plan.assistantId,
        accountId: conversation.externalAccountId,
        inboxId: conversation.externalInboxId,
      });
    } catch (error) {
      if (error instanceof Error && error.message === "CHATWOOT_SCOPE_AMBIGUOUS") {
        throw new ChatwootHandoffAdapterError("CHATWOOT_SCOPE_AMBIGUOUS", "BEFORE_MUTATION");
      }
      throw new ChatwootHandoffAdapterError("CHATWOOT_CONFIGURATION_NOT_FOUND", "BEFORE_MUTATION");
    }
    if (!config) {
      throw new ChatwootHandoffAdapterError(
        "CHATWOOT_CONFIGURATION_NOT_FOUND",
        "BEFORE_MUTATION",
      );
    }
    if (!config.isActive) {
      throw new ChatwootHandoffAdapterError("CHATWOOT_CONFIGURATION_INACTIVE", "BEFORE_MUTATION");
    }
    if (!config.apiAccessToken) {
      throw new ChatwootHandoffAdapterError("CHATWOOT_CREDENTIAL_UNAVAILABLE", "BEFORE_MUTATION");
    }
    if (
      config.companyId !== context.plan.companyId ||
      config.assistantId !== context.plan.assistantId
    ) {
      throw new ChatwootHandoffAdapterError("CHATWOOT_ACCOUNT_MISMATCH", "BEFORE_MUTATION");
    }
    if (config.accountId !== conversation.externalAccountId) {
      throw new ChatwootHandoffAdapterError("CHATWOOT_ACCOUNT_MISMATCH", "BEFORE_MUTATION");
    }
    if (config.inboxId !== conversation.externalInboxId) {
      throw new ChatwootHandoffAdapterError("CHATWOOT_INBOX_MISMATCH", "BEFORE_MUTATION");
    }
    return {
      config,
      externalConversationId: conversation.externalConversationId,
      externalAccountId: conversation.externalAccountId,
      externalInboxId: conversation.externalInboxId,
    };
  }

  private async requestJson(
    context: OperationalChatwootContext,
    method: ChatwootHandoffHttpMethod,
    body: Record<string, boolean> | null,
    readErrorCode: string,
  ): Promise<Record<string, unknown>> {
    const baseUrl = context.config.baseUrl.trim().replace(/\/$/, "");
    const url = `${baseUrl}/api/v1/accounts/${encodeURIComponent(context.externalAccountId)}/conversations/${encodeURIComponent(context.externalConversationId)}`;
    const controller = new AbortController();
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(
          new ChatwootHandoffAdapterError(
            method === "PUT" ? "CHATWOOT_PAUSE_AI_TIMEOUT_UNKNOWN_EFFECT" : readErrorCode,
            method === "PUT" ? "AFTER_MUTATION" : "BEFORE_MUTATION",
            method === "PUT",
          ),
        );
        controller.abort();
      }, this.timeoutMs);
    });
    try {
      const response = await Promise.race([
        this.fetchImpl(url, {
          method,
          signal: controller.signal,
          headers: {
            accept: "application/json",
            "content-type": "application/json",
            api_access_token: context.config.apiAccessToken as string,
          },
          ...(body ? { body: JSON.stringify(body) } : {}),
        }),
        timeout,
      ]);
      if (!response.ok) {
        throw new ChatwootHandoffAdapterError(
          method === "PUT" && response.status >= 500
            ? "CHATWOOT_PAUSE_AI_TIMEOUT_UNKNOWN_EFFECT"
            : readErrorCode,
          method === "PUT" && response.status >= 500 ? "AFTER_MUTATION" : "BEFORE_MUTATION",
          method === "PUT" && response.status >= 500,
        );
      }
      if (method === "PUT") return {};
      const payload = (await response.json()) as unknown;
      return readObject(payload);
    } catch (error) {
      if (error instanceof ChatwootHandoffAdapterError) throw error;
      throw new ChatwootHandoffAdapterError(
        readErrorCode,
        method === "PUT" ? "AFTER_MUTATION" : "BEFORE_MUTATION",
        method === "PUT",
      );
    } finally {
      if (timeoutHandle) clearTimeout(timeoutHandle);
    }
  }

  private toConversationState(
    context: OperationalChatwootContext,
    payload: Record<string, unknown>,
    adapterContext: ChatwootHandoffAdapterContext,
  ): ChatwootHandoffConversationState {
    const externalScope = readExternalScope(payload);
    if (externalScope.accountId && externalScope.accountId !== context.externalAccountId) {
      throw new ChatwootHandoffAdapterError("CHATWOOT_ACCOUNT_MISMATCH", "BEFORE_MUTATION");
    }
    if (externalScope.inboxId && externalScope.inboxId !== context.externalInboxId) {
      throw new ChatwootHandoffAdapterError("CHATWOOT_INBOX_MISMATCH", "BEFORE_MUTATION");
    }
    const aiActive = readAiActive(payload);
    if (aiActive === null) {
      throw new ChatwootHandoffAdapterError("CHATWOOT_CONVERSATION_READ_FAILED", "BEFORE_MUTATION");
    }
    const humanActive = readHumanActive(payload);
    const conversationStatus = readConversationStatus(payload);
    const stateHash = hashMetadata({
      aiActive,
      humanActive,
      conversationStatus,
      assigneePresent: readPresence(payload, "assignee"),
      teamPresent: readPresence(payload, "team"),
    });
    return {
      conversationExists: true,
      accountScopeValid: true,
      inboxScopeValid: true,
      companyId: context.config.companyId,
      assistantId: context.config.assistantId as string,
      conversationId: adapterContext.plan.conversationId,
      contactId: adapterContext.handoff.contactId ?? null,
      contextVersion: adapterContext.plan.contextVersion,
      inboxMatches: true,
      configReady: true,
      aiActive,
      humanActive,
      humanActivityDetected: humanActive,
      assigneePresent: readPresence(payload, "assignee"),
      teamPresent: readPresence(payload, "team"),
      labelApplied: false,
      teamAssigned: false,
      agentAssigned: false,
      conversationStatus,
      fetchedAt: this.now().toISOString(),
      stateHash,
      finalStateVerified: true,
    };
  }
}

export type ChatwootHandoffAdapterResolution = {
  adapter: ChatwootHandoffAdapter | null;
  eligible: boolean;
  resolved: boolean;
  errorCode: string | null;
};

export function buildOperationalChatwootHandoffManifest(input: {
  mode: RuntimeV2HandoffAdapterMode;
  resolution: ChatwootHandoffAdapterResolution;
  configurationResolved: boolean;
  scopeValidated: boolean;
  conversationReadAttempted: boolean;
  conversationReadSucceeded: boolean;
  before?: ChatwootHandoffConversationState | null;
  after?: ChatwootHandoffConversationState | null;
  result?: ChatwootHandoffExecutionResult | null;
  finalVerificationStatus?: string | null;
  reconciliationReadOnly?: boolean;
}): Record<string, unknown> {
  const result = input.result;
  return {
    handoffAdapterMode: input.mode,
    operationalAdapterEligible: input.resolution.eligible,
    operationalAdapterResolved: input.resolution.resolved,
    chatwootConfigurationResolved: input.configurationResolved,
    chatwootScopeValidated: input.scopeValidated,
    chatwootConversationReadAttempted: input.conversationReadAttempted,
    chatwootConversationReadSucceeded: input.conversationReadSucceeded,
    chatwootAiActiveBefore: input.before?.aiActive ?? result?.aiActiveBefore ?? null,
    chatwootPauseAiAttempted: result?.attemptedSteps.includes("PAUSE_AI") ?? false,
    chatwootPauseAiHttpOutcome: result?.status === "SUCCEEDED" ? "SUCCEEDED" : null,
    chatwootFinalVerificationAttempted:
      result?.attemptedSteps.includes("VERIFY_FINAL_STATE") ?? false,
    chatwootFinalVerificationStatus: input.finalVerificationStatus ?? null,
    chatwootAiActiveAfter: input.after?.aiActive ?? result?.aiActiveAfter ?? null,
    chatwootReconciliationReadOnly: input.reconciliationReadOnly ?? false,
    chatwootExternalEffectMayHaveOccurred: result?.externalEffectMayHaveOccurred ?? false,
    chatwootAdapterErrorCode: result?.errorCode ?? input.resolution.errorCode,
    chatwootPayloadPersisted: false,
    chatwootTokenPersisted: false,
    chatwootMessageSent: false,
    chatwootLabelApplied: false,
    chatwootAssignmentChanged: false,
    chatwootStatusChanged: false,
    providerCalled: false,
    outboundSent: false,
  };
}

export function resolveChatwootHandoffAdapter(input: {
  environment?: NodeJS.ProcessEnv;
  scope: HandoffStateScope;
  handoff: HandoffRequest;
  createAdapter: () => ChatwootHandoffAdapter;
}): ChatwootHandoffAdapterResolution {
  const environment = input.environment ?? process.env;
  if (resolveRuntimeV2HandoffAdapterMode(environment) !== "CHATWOOT_CONTROLLED") {
    return {
      adapter: null,
      eligible: false,
      resolved: false,
      errorCode: "CHATWOOT_ADAPTER_DISABLED",
    };
  }
  const preconditions = validateChatwootHandoffExecutionPreconditions({
    environment,
    scope: input.scope,
    handoff: input.handoff,
    currentTime: new Date(),
  });
  if (!preconditions.ok) {
    return { adapter: null, eligible: false, resolved: false, errorCode: preconditions.errorCode };
  }
  return { adapter: input.createAdapter(), eligible: true, resolved: true, errorCode: null };
}

export function resolveChatwootHandoffExecutor(input: {
  environment?: NodeJS.ProcessEnv;
  scope: HandoffStateScope;
  handoff: HandoffRequest;
  createAdapter: () => ChatwootHandoffAdapter;
}): {
  adapter: ChatwootHandoffAdapter | null;
  executor: ControlledChatwootHandoffExecutor | null;
  eligible: boolean;
  errorCode: string | null;
} {
  const resolution = resolveChatwootHandoffAdapter(input);
  return {
    adapter: resolution.adapter,
    executor: resolution.adapter ? new ControlledChatwootHandoffExecutor(resolution.adapter) : null,
    eligible: resolution.eligible,
    errorCode: resolution.errorCode,
  };
}

export function resolveOperationalAdapterMode(
  environment: NodeJS.ProcessEnv = process.env,
): RuntimeV2HandoffAdapterMode {
  return resolveRuntimeV2HandoffAdapterMode(environment);
}
