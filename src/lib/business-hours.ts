import type { BusinessDayKey, BusinessHoursInterval, BusinessHoursSchedule } from "@/types";

export const BUSINESS_DAYS: Array<{
  id: BusinessDayKey;
  label: string;
  short: string;
}> = [
  { id: "monday", label: "Segunda-feira", short: "Seg" },
  { id: "tuesday", label: "Terça-feira", short: "Ter" },
  { id: "wednesday", label: "Quarta-feira", short: "Qua" },
  { id: "thursday", label: "Quinta-feira", short: "Qui" },
  { id: "friday", label: "Sexta-feira", short: "Sex" },
  { id: "saturday", label: "Sábado", short: "Sáb" },
  { id: "sunday", label: "Domingo", short: "Dom" },
];

const TIME_PATTERN = /^\d{2}:\d{2}$/;

export function createDefaultBusinessHoursSchedule(): BusinessHoursSchedule {
  return {
    monday: [{ start: "08:00", end: "18:00" }],
    tuesday: [{ start: "08:00", end: "18:00" }],
    wednesday: [{ start: "08:00", end: "18:00" }],
    thursday: [{ start: "08:00", end: "18:00" }],
    friday: [{ start: "08:00", end: "18:00" }],
    saturday: [{ start: "08:00", end: "18:00" }],
    sunday: [],
  };
}

function toRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function normalizeInterval(value: unknown): BusinessHoursInterval | null {
  const record = toRecord(value);
  if (!record) {
    return null;
  }

  const start =
    typeof record.start === "string" && TIME_PATTERN.test(record.start) ? record.start : null;
  const end = typeof record.end === "string" && TIME_PATTERN.test(record.end) ? record.end : null;
  return start && end ? { start, end } : null;
}

function sortIntervals(intervals: BusinessHoursInterval[]): BusinessHoursInterval[] {
  return [...intervals].sort((left, right) => toMinutes(left.start) - toMinutes(right.start));
}

export function normalizeBusinessHoursSchedule(raw: unknown): BusinessHoursSchedule {
  const base = createDefaultBusinessHoursSchedule();
  const record = toRecord(raw);
  if (!record) {
    return base;
  }

  const next: BusinessHoursSchedule = { ...base };

  for (const day of BUSINESS_DAYS) {
    const rawDay = record[day.id];
    if (Array.isArray(rawDay)) {
      next[day.id] = sortIntervals(
        rawDay
          .map((interval) => normalizeInterval(interval))
          .filter((interval): interval is BusinessHoursInterval => interval !== null),
      );
      continue;
    }

    const legacyRecord = toRecord(rawDay);
    if (!legacyRecord) {
      continue;
    }

    if (Array.isArray(legacyRecord.intervals)) {
      next[day.id] = sortIntervals(
        legacyRecord.intervals
          .map((interval) => normalizeInterval(interval))
          .filter((interval): interval is BusinessHoursInterval => interval !== null),
      );
      continue;
    }

    if (legacyRecord.open === false) {
      next[day.id] = [];
      continue;
    }

    const legacyInterval = normalizeInterval(legacyRecord);
    next[day.id] = legacyInterval ? [legacyInterval] : [];
  }

  return next;
}

export function validateBusinessHoursSchedule(
  schedule: BusinessHoursSchedule,
): Record<BusinessDayKey, string | null> {
  const result = {} as Record<BusinessDayKey, string | null>;

  for (const day of BUSINESS_DAYS) {
    const intervals = sortIntervals(schedule[day.id]);
    result[day.id] = null;

    for (let index = 0; index < intervals.length; index += 1) {
      const current = intervals[index];
      const start = toMinutes(current.start);
      const end = toMinutes(current.end);

      if (start >= end) {
        result[day.id] = "O início precisa ser menor que o fim.";
        break;
      }

      const previous = intervals[index - 1];
      if (previous && toMinutes(previous.end) > start) {
        result[day.id] = "Os intervalos não podem se sobrepor.";
        break;
      }
    }
  }

  return result;
}

export function hasBusinessHoursValidationErrors(schedule: BusinessHoursSchedule): boolean {
  return Object.values(validateBusinessHoursSchedule(schedule)).some(Boolean);
}

export function collapseToContinuousInterval(
  intervals: BusinessHoursInterval[],
): BusinessHoursInterval[] {
  if (intervals.length === 0) {
    return [{ start: "08:00", end: "18:00" }];
  }

  const sorted = sortIntervals(intervals);
  return [
    {
      start: sorted[0].start,
      end: sorted[sorted.length - 1].end,
    },
  ];
}

export function buildCityRegion(city: string, state: string, fallback: string): string | null {
  const parts = [city.trim(), state.trim()].filter(Boolean);
  if (parts.length === 2) {
    return `${parts[0]}, ${parts[1]}`;
  }

  return fallback.trim() || null;
}

export function isValidIanaTimezone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("pt-BR", { timeZone: value }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function toMinutes(value: string): number {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}
