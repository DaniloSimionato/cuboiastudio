import { type FreshnessStatus, type SourceType } from "./evidence-contracts";

export type FreshnessPolicy = {
  ttlMs?: number;
  allowStaleAsAuthority?: boolean;
  allowUnknownAsAuthority?: boolean;
};

export type FreshnessEvaluation = {
  status: FreshnessStatus;
  eligible: boolean;
  reason:
    | "CURRENT"
    | "STALE_TTL"
    | "EXPIRED_VALID_UNTIL"
    | "NOT_YET_VALID"
    | "UNKNOWN_NO_VALIDITY"
    | "UNKNOWN_INVALID_DATE"
    | "UNKNOWN_NO_OBSERVED_AT";
};

function parseDate(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function evaluateFreshness(input: {
  sourceType: SourceType;
  category: string;
  observedAt?: string | null;
  validFrom?: string | null;
  validUntil?: string | null;
  policy?: FreshnessPolicy;
  currentTime: Date;
}): FreshnessEvaluation {
  const now = input.currentTime.getTime();
  const observedAt = parseDate(input.observedAt);
  const validFrom = parseDate(input.validFrom);
  const validUntil = parseDate(input.validUntil);
  const hasInvalidDate = Boolean(
    (input.observedAt && observedAt === null) ||
    (input.validFrom && validFrom === null) ||
    (input.validUntil && validUntil === null),
  );

  if (hasInvalidDate || observedAt === null) {
    return {
      status: "UNKNOWN",
      eligible: false,
      reason: !input.observedAt ? "UNKNOWN_NO_OBSERVED_AT" : "UNKNOWN_INVALID_DATE",
    };
  }
  if (validFrom !== null && now < validFrom) {
    return { status: "UNKNOWN", eligible: false, reason: "NOT_YET_VALID" };
  }
  if (validUntil !== null && now > validUntil) {
    return { status: "EXPIRED", eligible: false, reason: "EXPIRED_VALID_UNTIL" };
  }
  if (validUntil !== null || validFrom !== null) {
    return { status: "CURRENT", eligible: true, reason: "CURRENT" };
  }
  const ttlMs = input.policy?.ttlMs;
  if (ttlMs !== undefined && ttlMs >= 0 && now - observedAt > ttlMs) {
    return {
      status: "STALE",
      eligible: input.policy?.allowStaleAsAuthority === true,
      reason: "STALE_TTL",
    };
  }
  if (ttlMs !== undefined && ttlMs >= 0) {
    return { status: "CURRENT", eligible: true, reason: "CURRENT" };
  }
  return {
    status: "UNKNOWN",
    eligible: input.policy?.allowUnknownAsAuthority === true,
    reason: "UNKNOWN_NO_VALIDITY",
  };
}
