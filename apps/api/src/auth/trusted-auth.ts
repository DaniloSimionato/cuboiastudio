import { createHmac, timingSafeEqual } from "node:crypto";

export const TRUSTED_AUTH_SIGNATURE_ALGORITHM = "sha256";
export const DEFAULT_TRUSTED_AUTH_MAX_SKEW_MS = 5 * 60 * 1000;

type TrustedAuthSignatureInput = {
  userId: string;
  email: string;
  name: string;
  timestamp: string;
};

function buildTrustedAuthPayload(input: TrustedAuthSignatureInput): string {
  return [
    input.userId.trim(),
    input.email.trim().toLowerCase(),
    input.name.trim(),
    input.timestamp.trim(),
  ].join("\n");
}

export function buildTrustedAuthSignature(
  input: TrustedAuthSignatureInput & { secret: string },
): string {
  return createHmac(TRUSTED_AUTH_SIGNATURE_ALGORITHM, input.secret)
    .update(buildTrustedAuthPayload(input))
    .digest("hex");
}

export function verifyTrustedAuthSignature(
  input: TrustedAuthSignatureInput & {
    secret: string;
    providedSignature: string;
    now?: number;
    maxSkewMs?: number;
  },
): { ok: true } | { ok: false; reason: string } {
  const timestampMs = Date.parse(input.timestamp);

  if (!Number.isFinite(timestampMs)) {
    return { ok: false, reason: "invalid_timestamp" };
  }

  const now = input.now ?? Date.now();
  const maxSkewMs = input.maxSkewMs ?? DEFAULT_TRUSTED_AUTH_MAX_SKEW_MS;

  if (Math.abs(now - timestampMs) > maxSkewMs) {
    return { ok: false, reason: "expired_signature" };
  }

  const expected = Buffer.from(buildTrustedAuthSignature(input), "utf8");
  const provided = Buffer.from(input.providedSignature.trim(), "utf8");

  if (expected.length !== provided.length) {
    return { ok: false, reason: "invalid_signature" };
  }

  return timingSafeEqual(expected, provided)
    ? { ok: true }
    : { ok: false, reason: "invalid_signature" };
}
