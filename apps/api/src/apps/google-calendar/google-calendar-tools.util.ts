export function normalizePhone(value?: string | null): string {
  return (value ?? "").replace(/\D/g, "");
}

export function maskPhone(value?: string | null): string | null {
  const normalized = normalizePhone(value);

  if (!normalized) {
    return null;
  }

  if (normalized.length <= 4) {
    return normalized;
  }

  return `${normalized.slice(0, 4)}***${normalized.slice(-2)}`;
}

export function sanitizeText(value?: string | null, maxLength = 500): string | null {
  const trimmed = (value ?? "").replace(/\s+/g, " ").trim();
  return trimmed.length > 0 ? trimmed.slice(0, maxLength) : null;
}

export function minutesToMs(minutes: number): number {
  return minutes * 60 * 1000;
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutesToMs(minutes));
}

export function buildIdempotencyKey(input: {
  conversationId?: string | null;
  resourceId: string;
  startAt: Date;
  endAt: Date;
}): string {
  const conversationKey = input.conversationId?.trim() || "no-conversation";
  return [
    conversationKey,
    input.resourceId,
    input.startAt.toISOString(),
    input.endAt.toISOString(),
  ].join("|");
}

export function formatDateTimeForLabel(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function zonedDateTimeToDate(date: string, time: string, timezone: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));
  const offsetMs = getTimezoneOffsetMs(utcGuess, timezone);
  return new Date(utcGuess.getTime() - offsetMs);
}

export function getTimezoneOffsetMs(date: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const asUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  );

  return asUtc - date.getTime();
}

export function parseDateTime(value: string): Date {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date-time.");
  }

  return date;
}

export function overlapRanges(
  firstStart: Date,
  firstEnd: Date,
  secondStart: Date,
  secondEnd: Date,
): boolean {
  return firstStart < secondEnd && firstEnd > secondStart;
}
