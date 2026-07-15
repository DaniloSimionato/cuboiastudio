import { type ScopeContext, type SourceEvidence, type SourceType } from "./evidence-contracts";

export type ScopeValidationStatus =
  | "VALID"
  | "COMPANY_SCOPE_MISMATCH"
  | "ASSISTANT_SCOPE_MISMATCH"
  | "CONTACT_SCOPE_MISMATCH"
  | "CONVERSATION_SCOPE_MISMATCH"
  | "CONTEXT_VERSION_MISMATCH"
  | "REQUIRED_SCOPE_MISSING";

export type ScopeValidationResult = {
  status: ScopeValidationStatus;
  valid: boolean;
  reason: string;
};

function isBlank(value: string | null | undefined): boolean {
  return !value || value.trim().length === 0;
}

function requiresContact(sourceType: SourceType): boolean {
  return sourceType === "CONTACT_MEMORY" || sourceType === "TEMPORARY_MEMORY";
}

function requiresSession(sourceType: SourceType): boolean {
  return sourceType === "SESSION_FACT" || sourceType === "CUSTOMER_PROVIDED";
}

export function validateEvidenceScope(
  evidence: Pick<
    SourceEvidence,
    "sourceType" | "companyId" | "assistantId" | "contactId" | "conversationId" | "contextVersion"
  >,
  scope: ScopeContext,
): ScopeValidationResult {
  if (isBlank(scope.companyId) || isBlank(evidence.companyId)) {
    return { status: "REQUIRED_SCOPE_MISSING", valid: false, reason: "COMPANY_ID_REQUIRED" };
  }
  if (evidence.companyId !== scope.companyId) {
    return { status: "COMPANY_SCOPE_MISMATCH", valid: false, reason: "COMPANY_ID_MISMATCH" };
  }
  if (evidence.assistantId && (!scope.assistantId || evidence.assistantId !== scope.assistantId)) {
    return { status: "ASSISTANT_SCOPE_MISMATCH", valid: false, reason: "ASSISTANT_ID_MISMATCH" };
  }
  if (
    requiresContact(evidence.sourceType) &&
    (isBlank(evidence.contactId) || isBlank(scope.contactId))
  ) {
    return { status: "REQUIRED_SCOPE_MISSING", valid: false, reason: "CONTACT_ID_REQUIRED" };
  }
  if (evidence.contactId && evidence.contactId !== scope.contactId) {
    return { status: "CONTACT_SCOPE_MISMATCH", valid: false, reason: "CONTACT_ID_MISMATCH" };
  }
  if (
    requiresSession(evidence.sourceType) &&
    (isBlank(evidence.conversationId) || !scope.conversationId)
  ) {
    return { status: "REQUIRED_SCOPE_MISSING", valid: false, reason: "CONVERSATION_ID_REQUIRED" };
  }
  if (evidence.conversationId && evidence.conversationId !== scope.conversationId) {
    return {
      status: "CONVERSATION_SCOPE_MISMATCH",
      valid: false,
      reason: "CONVERSATION_ID_MISMATCH",
    };
  }
  if (evidence.contextVersion !== null && evidence.contextVersion !== undefined) {
    if (scope.contextVersion === null || scope.contextVersion === undefined) {
      return { status: "REQUIRED_SCOPE_MISSING", valid: false, reason: "CONTEXT_VERSION_REQUIRED" };
    }
    if (evidence.contextVersion !== scope.contextVersion) {
      return {
        status: "CONTEXT_VERSION_MISMATCH",
        valid: false,
        reason: "CONTEXT_VERSION_MISMATCH",
      };
    }
  }
  if (
    requiresSession(evidence.sourceType) &&
    (scope.contextVersion === null || scope.contextVersion === undefined)
  ) {
    return { status: "REQUIRED_SCOPE_MISSING", valid: false, reason: "CONTEXT_VERSION_REQUIRED" };
  }
  return { status: "VALID", valid: true, reason: "IN_SCOPE" };
}
