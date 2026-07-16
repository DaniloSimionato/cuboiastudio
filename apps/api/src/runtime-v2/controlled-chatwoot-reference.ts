import { createHash } from "node:crypto";
import type { PrismaService } from "../database/prisma.service";
import { ChatwootInboxConfigService } from "../chatwoot/chatwoot-inbox-config.service";
import type { HandoffStateScope } from "./handoff-state";

export type ControlledChatwootReferenceResolutionStatus =
  | "RESOLVED"
  | "REFERENCE_NOT_FOUND"
  | "CHANNEL_BINDING_MISSING"
  | "CONFIGURATION_MISSING"
  | "CONFIGURATION_INACTIVE"
  | "SCOPE_AMBIGUOUS";

export type ControlledChatwootReference = {
  companyId: string;
  assistantId: string;
  internalConversationId: string;
  contextVersion: number;
  channelBindingPresent: boolean;
  configurationPresent: boolean;
  configurationActive: boolean;
  accountScopeHash: string | null;
  inboxScopeHash: string | null;
  externalConversationReferenceHash: string | null;
  scopeValid: boolean;
  resolutionStatus: ControlledChatwootReferenceResolutionStatus;
  redactionApplied: true;
};

function hashValue(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function baseReference(
  scope: HandoffStateScope,
  status: ControlledChatwootReferenceResolutionStatus,
): ControlledChatwootReference {
  return {
    companyId: scope.companyId,
    assistantId: scope.assistantId,
    internalConversationId: scope.conversationId,
    contextVersion: scope.contextVersion,
    channelBindingPresent: false,
    configurationPresent: false,
    configurationActive: false,
    accountScopeHash: null,
    inboxScopeHash: null,
    externalConversationReferenceHash: null,
    scopeValid: false,
    resolutionStatus: status,
    redactionApplied: true,
  };
}

export class ControlledChatwootReferenceResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chatwootInboxConfigService: ChatwootInboxConfigService,
  ) {}

  async resolve(scope: HandoffStateScope): Promise<ControlledChatwootReference> {
    const conversation = await this.prisma.assistantConversation.findFirst({
      where: {
        id: scope.conversationId,
        companyId: scope.companyId,
        assistantId: scope.assistantId,
      },
      select: {
        source: true,
        externalConversationId: true,
        externalAccountId: true,
        externalInboxId: true,
      },
    });

    if (!conversation) return baseReference(scope, "REFERENCE_NOT_FOUND");

    const channelBindingPresent =
      conversation.source === "CHATWOOT" &&
      Boolean(
        conversation.externalConversationId &&
        conversation.externalAccountId &&
        conversation.externalInboxId,
      );
    const accountScopeHash = conversation.externalAccountId
      ? hashValue([scope.companyId, conversation.externalAccountId])
      : null;
    const inboxScopeHash = conversation.externalInboxId
      ? hashValue([scope.companyId, conversation.externalInboxId])
      : null;
    const externalConversationReferenceHash = conversation.externalConversationId
      ? hashValue([
          scope.companyId,
          conversation.externalAccountId,
          conversation.externalInboxId,
          conversation.externalConversationId,
        ])
      : null;

    if (!channelBindingPresent) {
      return {
        ...baseReference(scope, "CHANNEL_BINDING_MISSING"),
        channelBindingPresent: false,
        accountScopeHash,
        inboxScopeHash,
        externalConversationReferenceHash,
      };
    }

    const configurations = await this.chatwootInboxConfigService.list(scope.companyId);
    const matching = configurations.filter(
      (configuration) =>
        configuration.assistantId === scope.assistantId &&
        configuration.accountId === conversation.externalAccountId &&
        configuration.inboxId === conversation.externalInboxId,
    );
    const active = matching.filter((configuration) => configuration.isActive);

    if (active.length > 1) {
      return {
        ...baseReference(scope, "SCOPE_AMBIGUOUS"),
        channelBindingPresent: true,
        configurationPresent: true,
        configurationActive: true,
        accountScopeHash,
        inboxScopeHash,
        externalConversationReferenceHash,
      };
    }
    if (active.length === 0) {
      return {
        ...baseReference(
          scope,
          matching.length > 0 ? "CONFIGURATION_INACTIVE" : "CONFIGURATION_MISSING",
        ),
        channelBindingPresent: true,
        configurationPresent: matching.length > 0,
        configurationActive: false,
        accountScopeHash,
        inboxScopeHash,
        externalConversationReferenceHash,
      };
    }

    return {
      companyId: scope.companyId,
      assistantId: scope.assistantId,
      internalConversationId: scope.conversationId,
      contextVersion: scope.contextVersion,
      channelBindingPresent: true,
      configurationPresent: true,
      configurationActive: true,
      accountScopeHash,
      inboxScopeHash,
      externalConversationReferenceHash,
      scopeValid: true,
      resolutionStatus: "RESOLVED",
      redactionApplied: true,
    };
  }
}
