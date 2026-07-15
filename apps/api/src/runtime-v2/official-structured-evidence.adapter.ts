import { Injectable } from "@nestjs/common";
import { Status } from "@prisma/client";
import {
  BUSINESS_DAY_KEYS,
  isValidIanaTimezone,
  normalizeBusinessHoursSchedule,
  validateBusinessHoursSchedule,
  type BusinessDayKey,
  type BusinessHoursSchedule,
} from "../assistants/official-business-context";
import { PrismaService } from "../database/prisma.service";
import {
  EVIDENCE_CONTRACT_VERSION,
  createEvidenceId,
  type EvidenceJsonValue,
  type SourceEvidence,
} from "./evidence-contracts";
import { evaluateFreshness } from "./evidence-freshness";
import { type EvidenceCategory } from "./authority-evidence-policy";

export const OFFICIAL_STRUCTURED_CATEGORIES = [
  "COMPANY_IDENTITY",
  "ADDRESS",
  "OFFICIAL_CONTACT",
  "BUSINESS_HOURS",
  "BUSINESS_HOURS_EXCEPTION",
] as const satisfies readonly EvidenceCategory[];

export type OfficialStructuredCategory = (typeof OFFICIAL_STRUCTURED_CATEGORIES)[number];

export type OfficialStructuredEvidenceInput = {
  companyId: string;
  assistantId: string;
  requestedCategories: string[];
  currentTime: Date;
  timezone?: string | null;
};

export type OfficialStructuredEvidenceResult = {
  evidence: SourceEvidence[];
  missingCategories: string[];
  failures: string[];
  scopeValidationFailures?: string[];
  adapterStatus: "COMPLETED" | "PARTIAL" | "EMPTY" | "FAILED";
  durationMs: number;
};

export interface OfficialStructuredEvidenceReader {
  read(input: OfficialStructuredEvidenceInput): Promise<OfficialStructuredEvidenceResult>;
}

type OfficialAssistantRecord = {
  id: string;
  companyId: string;
  businessAddress: string | null;
  businessCityRegion: string | null;
  businessCity: string | null;
  businessState: string | null;
  businessPostalCode: string | null;
  businessPhone: string | null;
  businessWhatsapp: string | null;
  businessWhatsappSupport: string | null;
  websiteUrl: string | null;
  timezone: string | null;
  weeklySchedule: unknown;
  updatedAt: Date;
  company: {
    id: string;
    name: string;
    timezone: string;
    status: Status;
    updatedAt: Date;
  };
};

const OFFICIAL_ASSISTANT_SELECT = {
  id: true,
  companyId: true,
  businessAddress: true,
  businessCityRegion: true,
  businessCity: true,
  businessState: true,
  businessPostalCode: true,
  businessPhone: true,
  businessWhatsapp: true,
  businessWhatsappSupport: true,
  websiteUrl: true,
  timezone: true,
  weeklySchedule: true,
  updatedAt: true,
  company: {
    select: {
      id: true,
      name: true,
      timezone: true,
      status: true,
      updatedAt: true,
    },
  },
} as const;

const DAY_SET = new Set<string>(BUSINESS_DAY_KEYS);

function normalizeText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function normalizeOfficialPhone(value: unknown): string | null {
  const text = normalizeText(value);
  if (!text) return null;
  const digits = text.replace(/\D/g, "");
  return digits.length >= 8 ? digits : null;
}

export function normalizeOfficialUrl(value: unknown): string | null {
  const text = normalizeText(value);
  if (!text) return null;
  try {
    const url = new URL(text);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function normalizeOfficialAddress(input: {
  address?: unknown;
  city?: unknown;
  region?: unknown;
  state?: unknown;
  postalCode?: unknown;
}): Record<string, string> | null {
  const result = Object.fromEntries(
    Object.entries({
      address: normalizeText(input.address),
      city: normalizeText(input.city),
      region: normalizeText(input.region),
      state: normalizeText(input.state),
      postalCode: normalizeText(input.postalCode),
    }).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
  return Object.keys(result).length > 0 ? result : null;
}

function isValidTime(value: unknown): value is string {
  return typeof value === "string" && /^\d{2}:\d{2}$/.test(value);
}

function isValidRawDay(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.every(
      (interval) =>
        typeof interval === "object" &&
        interval !== null &&
        isValidTime((interval as Record<string, unknown>).start) &&
        isValidTime((interval as Record<string, unknown>).end),
    );
  }
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  if (record.open === false) return true;
  return isValidTime(record.start) && isValidTime(record.end);
}

export function normalizeOfficialWeeklySchedule(
  value: unknown,
): { schedule: BusinessHoursSchedule; timezoneRequired: true } | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const days = Object.entries(raw).filter(([key]) => DAY_SET.has(key));
  if (days.length === 0 || days.some(([, day]) => !isValidRawDay(day))) return null;
  if (validateBusinessHoursSchedule(raw).length > 0) return null;
  return { schedule: normalizeBusinessHoursSchedule(raw), timezoneRequired: true };
}

function normalizeRequestedCategory(value: string): EvidenceCategory | null {
  const normalized = value.trim().toLowerCase().replace(/[-\s]/g, "_");
  const aliases: Record<string, EvidenceCategory> = {
    company_identity: "COMPANY_IDENTITY",
    identity: "COMPANY_IDENTITY",
    address: "ADDRESS",
    official_contact: "OFFICIAL_CONTACT",
    contact: "OFFICIAL_CONTACT",
    phone: "OFFICIAL_CONTACT",
    whatsapp: "OFFICIAL_CONTACT",
    business_hours: "BUSINESS_HOURS",
    businesshours: "BUSINESS_HOURS",
    hours: "BUSINESS_HOURS",
    booking: "BOOKING",
    availability: "AVAILABILITY",
    pickup: "PICKUP_DELIVERY",
    pickup_delivery: "PICKUP_DELIVERY",
  };
  return aliases[normalized] ?? (value in aliases ? aliases[value] : null);
}

function hasSpecificDayAndTime(message: string): boolean {
  const normalized = message
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
  const day = /\b(seg|segunda|terca|quarta|quinta|sexta|sabado|domingo)(?:-feira)?\b/.test(
    normalized,
  );
  const time = /\b\d{1,2}(?::\d{2})?\s*(?:h|horas)?\b/.test(normalized);
  return day && time;
}

export function deriveOfficialEvidenceCategories(input: {
  requestedCategories: string[];
  includeContactIdentity?: boolean;
  currentMessage?: string;
}): EvidenceCategory[] {
  const categories: EvidenceCategory[] = [];
  const add = (category: EvidenceCategory) => {
    if (!categories.includes(category)) categories.push(category);
  };
  if (input.includeContactIdentity) add("COMPANY_IDENTITY");

  const normalized = input.requestedCategories
    .map(normalizeRequestedCategory)
    .filter((item): item is EvidenceCategory => item !== null);
  if (normalized.includes("BOOKING") && hasSpecificDayAndTime(input.currentMessage ?? "")) {
    add("BUSINESS_HOURS");
  }
  normalized.forEach(add);
  return categories;
}

function asJsonValue(value: unknown): EvidenceJsonValue {
  return value as EvidenceJsonValue;
}

function sourceId(recordId: string, fieldKey: string): string {
  return `official-structured:${recordId}:${fieldKey}`;
}

function buildEvidence(input: {
  recordId: string;
  sourceTable: string;
  companyId: string;
  assistantId?: string;
  category: EvidenceCategory;
  fieldKey: string;
  value: EvidenceJsonValue;
  observedAt: Date;
  currentTime: Date;
  isSensitive?: boolean;
}): SourceEvidence | null {
  const observedAt = input.observedAt.toISOString();
  const freshness = evaluateFreshness({
    sourceType: "OFFICIAL_STRUCTURED",
    category: input.category,
    observedAt,
    validFrom: observedAt,
    currentTime: input.currentTime,
  });
  const id = sourceId(input.recordId, input.fieldKey);
  return {
    contractVersion: EVIDENCE_CONTRACT_VERSION,
    evidenceId: createEvidenceId({
      sourceType: "OFFICIAL_STRUCTURED",
      sourceId: id,
      companyId: input.companyId,
      assistantId: input.assistantId ?? null,
      category: input.category,
      fieldKey: input.fieldKey,
    }),
    sourceType: "OFFICIAL_STRUCTURED",
    sourceId: id,
    companyId: input.companyId,
    assistantId: input.assistantId ?? null,
    category: input.category,
    fieldKey: input.fieldKey,
    normalizedValue: asJsonValue(input.value),
    valueHash: createEvidenceId({
      sourceType: "OFFICIAL_STRUCTURED",
      sourceId: JSON.stringify(input.value),
      companyId: input.companyId,
      assistantId: input.assistantId ?? null,
      category: input.category,
      fieldKey: input.fieldKey,
    }),
    confidence: 1,
    authorityLevel: freshness.status === "CURRENT" ? "AUTHORITATIVE" : "CONTEXTUAL",
    observedAt,
    validFrom: observedAt,
    validUntil: null,
    freshnessStatus: freshness.status,
    provenance: {
      sourceTable: input.sourceTable,
      sourceRecordId: input.recordId,
      sourceVersion: observedAt,
      confirmedCategory: input.category,
    },
    isSensitive: input.isSensitive ?? false,
    isAuthoritative: freshness.status === "CURRENT",
    sourceStatus: "ACTIVE",
  };
}

function unique(values: string[]): string[] {
  return [...new Set(values)].sort();
}

@Injectable()
export class OfficialStructuredEvidenceAdapter implements OfficialStructuredEvidenceReader {
  constructor(private readonly prisma: PrismaService) {}

  async read(input: OfficialStructuredEvidenceInput): Promise<OfficialStructuredEvidenceResult> {
    const startedAt = Date.now();
    const requestedCategories = unique(input.requestedCategories);
    if (!input.companyId.trim() || !input.assistantId.trim()) {
      return {
        evidence: [],
        missingCategories: requestedCategories,
        failures: ["OFFICIAL_SCOPE_REQUIRED"],
        adapterStatus: "FAILED",
        durationMs: Date.now() - startedAt,
      };
    }

    try {
      const assistant = (await this.prisma.assistant.findFirst({
        where: {
          id: input.assistantId,
          companyId: input.companyId,
          status: Status.ACTIVE,
          company: { status: Status.ACTIVE },
        },
        select: OFFICIAL_ASSISTANT_SELECT,
      })) as OfficialAssistantRecord | null;

      if (!assistant || assistant.company.id !== input.companyId) {
        return {
          evidence: [],
          missingCategories: requestedCategories,
          failures: ["OFFICIAL_ASSISTANT_NOT_FOUND"],
          adapterStatus: "FAILED",
          durationMs: Date.now() - startedAt,
        };
      }

      const evidence: SourceEvidence[] = [];
      const failures: string[] = [];
      const missing = new Set<string>();
      const add = (category: string, item: SourceEvidence | null, failure?: string) => {
        if (item) evidence.push(item);
        else {
          missing.add(category);
          if (failure) failures.push(failure);
        }
      };

      for (const category of requestedCategories) {
        switch (category) {
          case "COMPANY_IDENTITY":
            add(
              category,
              buildEvidence({
                recordId: assistant.company.id,
                sourceTable: "companies",
                companyId: input.companyId,
                category,
                fieldKey: "company.name",
                value: assistant.company.name,
                observedAt: assistant.company.updatedAt,
                currentTime: input.currentTime,
              }),
              "OFFICIAL_COMPANY_NAME_MISSING",
            );
            break;
          case "ADDRESS": {
            const address = normalizeOfficialAddress({
              address: assistant.businessAddress,
              city: assistant.businessCity,
              region: assistant.businessCityRegion,
              state: assistant.businessState,
              postalCode: assistant.businessPostalCode,
            });
            add(
              category,
              address
                ? buildEvidence({
                    recordId: assistant.id,
                    sourceTable: "assistants",
                    companyId: input.companyId,
                    assistantId: assistant.id,
                    category,
                    fieldKey: "assistant.businessAddress",
                    value: address,
                    observedAt: assistant.updatedAt,
                    currentTime: input.currentTime,
                    isSensitive: true,
                  })
                : null,
              "OFFICIAL_ADDRESS_MISSING_OR_INVALID",
            );
            break;
          }
          case "OFFICIAL_CONTACT": {
            const values = [
              ["assistant.businessPhone", normalizeOfficialPhone(assistant.businessPhone)],
              ["assistant.businessWhatsapp", normalizeOfficialPhone(assistant.businessWhatsapp)],
              [
                "assistant.businessWhatsappSupport",
                normalizeOfficialPhone(assistant.businessWhatsappSupport),
              ],
              ["assistant.websiteUrl", normalizeOfficialUrl(assistant.websiteUrl)],
            ] as const;
            const before = evidence.length;
            for (const [fieldKey, value] of values) {
              if (!value) continue;
              const item = buildEvidence({
                recordId: assistant.id,
                sourceTable: "assistants",
                companyId: input.companyId,
                assistantId: assistant.id,
                category,
                fieldKey,
                value,
                observedAt: assistant.updatedAt,
                currentTime: input.currentTime,
                isSensitive: fieldKey !== "assistant.websiteUrl",
              });
              if (item) evidence.push(item);
            }
            if (before === evidence.length) {
              missing.add(category);
              failures.push("OFFICIAL_CONTACT_MISSING_OR_INVALID");
            }
            break;
          }
          case "BUSINESS_HOURS": {
            const normalized = normalizeOfficialWeeklySchedule(assistant.weeklySchedule);
            const timezone =
              (isValidIanaTimezone(input.timezone ?? null) ? input.timezone : null) ??
              (isValidIanaTimezone(assistant.timezone) ? assistant.timezone : null) ??
              (isValidIanaTimezone(assistant.company.timezone) ? assistant.company.timezone : null);
            if (!normalized || !timezone) {
              add(
                category,
                null,
                !timezone ? "OFFICIAL_TIMEZONE_MISSING_OR_INVALID" : "OFFICIAL_HOURS_INVALID",
              );
              break;
            }
            add(
              category,
              buildEvidence({
                recordId: assistant.id,
                sourceTable: "assistants",
                companyId: input.companyId,
                assistantId: assistant.id,
                category,
                fieldKey: "assistant.weeklySchedule",
                value: { timezone, schedule: normalized.schedule },
                observedAt: assistant.updatedAt,
                currentTime: input.currentTime,
              }),
              "OFFICIAL_HOURS_INVALID",
            );
            break;
          }
          case "BUSINESS_HOURS_EXCEPTION":
            missing.add(category);
            failures.push("OFFICIAL_HOURS_EXCEPTIONS_UNSUPPORTED");
            break;
          default:
            missing.add(category);
            failures.push("OFFICIAL_CATEGORY_NOT_SUPPORTED");
        }
      }

      const missingCategories = unique([...missing]);
      const adapterStatus =
        evidence.length === 0
          ? "EMPTY"
          : failures.length > 0 || missingCategories.length > 0
            ? "PARTIAL"
            : "COMPLETED";
      return {
        evidence,
        missingCategories,
        failures: unique(failures),
        adapterStatus,
        durationMs: Date.now() - startedAt,
      };
    } catch {
      return {
        evidence: [],
        missingCategories: requestedCategories,
        failures: ["OFFICIAL_ADAPTER_READ_FAILED"],
        adapterStatus: "FAILED",
        durationMs: Date.now() - startedAt,
      };
    }
  }
}
