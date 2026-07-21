const DEFAULT_TIMEZONE = "America/Sao_Paulo";

export const BUSINESS_DAY_KEYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export type BusinessDayKey = (typeof BUSINESS_DAY_KEYS)[number];

export type BusinessHoursInterval = {
  start: string;
  end: string;
};

export type BusinessHoursSchedule = Record<BusinessDayKey, BusinessHoursInterval[]>;

export type BusinessHoursValidationIssue = {
  day: BusinessDayKey;
  index: number;
  message: string;
};

export type BusinessOpeningReference = {
  day: BusinessDayKey;
  dayLabel: string;
  localDate: string;
  time: string;
  minutes: number;
  dayOffset: number;
};

export type BusinessOpenStatus = {
  timezone: string;
  localDate: string;
  localDateLabel: string;
  localTime: string;
  dayOfWeek: BusinessDayKey;
  dayLabel: string;
  isOpenNow: boolean;
  isOnBreak: boolean;
  currentInterval: BusinessHoursInterval | null;
  nextOpening: BusinessOpeningReference | null;
  breakUntil: BusinessOpeningReference | null;
  todayIntervals: BusinessHoursInterval[];
  todaySummary: string;
  todayNaturalSummary: string;
  weeklySummary: string[];
  lunchBreakSummary: string;
  schedule: BusinessHoursSchedule;
};

export type OfficialBusinessContext = {
  companyName: string;
  assistantName?: string | null;
  companyTimezone: string;
  assistantTimezone: string | null;
  timezone: string;
  description: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  cityRegion: string | null;
  postalCode: string | null;
  googleMapsUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  whatsapp: string | null;
  whatsappSupport: string | null;
  websiteUrl: string | null;
  aiRespondsOutsideBusinessHours: boolean;
  businessHours: BusinessHoursSchedule;
  businessHoursConfigurationValid: boolean;
  businessHoursValidationIssueCount: number;
  businessStatus: BusinessOpenStatus;
  localityLabel: string | null;
  promptBlock: string;
  dataPriorityInstruction: string;
};

type LocalDateTimeParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: BusinessDayKey;
};

const WEEKDAY_FROM_INTL: Record<string, BusinessDayKey> = {
  monday: "monday",
  tuesday: "tuesday",
  wednesday: "wednesday",
  thursday: "thursday",
  friday: "friday",
  saturday: "saturday",
  sunday: "sunday",
};

const DAY_LABELS: Record<BusinessDayKey, string> = {
  monday: "segunda-feira",
  tuesday: "terça-feira",
  wednesday: "quarta-feira",
  thursday: "quinta-feira",
  friday: "sexta-feira",
  saturday: "sábado",
  sunday: "domingo",
};

const DAY_SHORT_LABELS: Record<BusinessDayKey, string> = {
  monday: "segunda",
  tuesday: "terça",
  wednesday: "quarta",
  thursday: "quinta",
  friday: "sexta",
  saturday: "sábado",
  sunday: "domingo",
};

const WEEKDAY_ALIASES: Array<[string, BusinessDayKey]> = [
  ["domingo", "sunday"],
  ["segunda", "monday"],
  ["terca", "tuesday"],
  ["quarta", "wednesday"],
  ["quinta", "thursday"],
  ["sexta", "friday"],
  ["sabado", "saturday"],
];

function findRequestedBusinessDay(question: string): BusinessDayKey | undefined {
  return WEEKDAY_ALIASES.find(([alias]) => new RegExp(`\\b${alias}(?:s)?\\b`).test(question))?.[1];
}

const TIME_PATTERN = /^\d{2}:\d{2}$/;

function normalizeString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function toRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function isBusinessDayKey(value: string): value is BusinessDayKey {
  return BUSINESS_DAY_KEYS.includes(value as BusinessDayKey);
}

function normalizeTimeString(value: unknown): string | null {
  const text = normalizeString(value);
  return text && TIME_PATTERN.test(text) ? text : null;
}

export function isValidIanaTimezone(value: string | null | undefined): boolean {
  if (!value) {
    return false;
  }

  try {
    new Intl.DateTimeFormat("pt-BR", { timeZone: value }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function resolveOfficialTimezone(input: {
  assistantTimezone?: string | null;
  companyTimezone?: string | null;
}): string {
  if (isValidIanaTimezone(input.assistantTimezone ?? null)) {
    return input.assistantTimezone!.trim();
  }

  if (isValidIanaTimezone(input.companyTimezone ?? null)) {
    return input.companyTimezone!.trim();
  }

  return DEFAULT_TIMEZONE;
}

function sortIntervals(intervals: BusinessHoursInterval[]): BusinessHoursInterval[] {
  return [...intervals].sort((left, right) => toMinutes(left.start) - toMinutes(right.start));
}

function ensureAllDays(schedule: Partial<BusinessHoursSchedule>): BusinessHoursSchedule {
  return BUSINESS_DAY_KEYS.reduce<BusinessHoursSchedule>(
    (acc, day) => ({
      ...acc,
      [day]: sortIntervals(schedule[day] ?? []),
    }),
    {} as BusinessHoursSchedule,
  );
}

function normalizeLegacyDay(rawDay: unknown): BusinessHoursInterval[] {
  if (Array.isArray(rawDay)) {
    return rawDay
      .map((interval) => {
        const record = toRecord(interval);
        if (!record) {
          return null;
        }

        const start = normalizeTimeString(record.start);
        const end = normalizeTimeString(record.end);
        return start && end ? { start, end } : null;
      })
      .filter((interval): interval is BusinessHoursInterval => interval !== null);
  }

  const record = toRecord(rawDay);
  if (!record) {
    return [];
  }

  if (Array.isArray(record.intervals)) {
    return normalizeLegacyDay(record.intervals);
  }

  if (record.open === false) {
    return [];
  }

  const start = normalizeTimeString(record.start);
  const end = normalizeTimeString(record.end);
  return start && end ? [{ start, end }] : [];
}

export function normalizeBusinessHoursSchedule(rawSchedule: unknown): BusinessHoursSchedule {
  const record = toRecord(rawSchedule);
  if (!record) {
    return ensureAllDays({});
  }

  const schedule: Partial<BusinessHoursSchedule> = {};
  for (const [key, value] of Object.entries(record)) {
    if (!isBusinessDayKey(key)) {
      continue;
    }

    schedule[key] = normalizeLegacyDay(value);
  }

  return ensureAllDays(schedule);
}

export function validateBusinessHoursSchedule(
  rawSchedule: unknown,
): BusinessHoursValidationIssue[] {
  const schedule = normalizeBusinessHoursSchedule(rawSchedule);
  const issues: BusinessHoursValidationIssue[] = [];

  for (const day of BUSINESS_DAY_KEYS) {
    const intervals = sortIntervals(schedule[day]);
    let previousEnd = -1;

    intervals.forEach((interval, index) => {
      const startMinutes = toMinutes(interval.start);
      const endMinutes = toMinutes(interval.end);

      if (startMinutes >= endMinutes) {
        issues.push({
          day,
          index,
          message: "O início deve ser menor que o fim.",
        });
      }

      if (previousEnd > startMinutes) {
        issues.push({
          day,
          index,
          message: "Os intervalos do dia não podem se sobrepor.",
        });
      }

      previousEnd = Math.max(previousEnd, endMinutes);
    });
  }

  return issues;
}

function toMinutes(value: string): number {
  const [hour, minute] = value.split(":").map((part) => Number(part));
  return hour * 60 + minute;
}

function toTimeString(minutes: number): string {
  const normalizedMinutes = ((minutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalizedMinutes / 60);
  const mins = normalizedMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function getLocalDateTimeParts(date: Date, timezone: string): LocalDateTimeParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "long",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const partMap = new Map(parts.map((part) => [part.type, part.value]));
  const weekdayText = partMap.get("weekday")?.toLowerCase() ?? "monday";
  const weekday = WEEKDAY_FROM_INTL[weekdayText] ?? "monday";

  return {
    year: Number(partMap.get("year") ?? "0"),
    month: Number(partMap.get("month") ?? "0"),
    day: Number(partMap.get("day") ?? "0"),
    hour: Number(partMap.get("hour") ?? "0"),
    minute: Number(partMap.get("minute") ?? "0"),
    weekday,
  };
}

function formatLocalDateLabel(parts: LocalDateTimeParts): string {
  return `${String(parts.day).padStart(2, "0")}/${String(parts.month).padStart(2, "0")}/${parts.year}`;
}

function formatLocalDateIso(parts: LocalDateTimeParts): string {
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function shiftDay(day: BusinessDayKey, offset: number): BusinessDayKey {
  const index = BUSINESS_DAY_KEYS.indexOf(day);
  return BUSINESS_DAY_KEYS[(index + offset + BUSINESS_DAY_KEYS.length) % BUSINESS_DAY_KEYS.length];
}

function formatIntervalsSummary(intervals: BusinessHoursInterval[]): string {
  if (intervals.length === 0) {
    return "fechado";
  }

  return intervals.map((interval) => `${interval.start} às ${interval.end}`).join(" e ");
}

function formatIntervalsNaturalSummary(intervals: BusinessHoursInterval[]): string {
  if (intervals.length === 0) {
    return "fechado";
  }

  if (intervals.length === 1) {
    return `das ${intervals[0].start} às ${intervals[0].end}`;
  }

  return intervals
    .map((interval, index) => `${index === 0 ? "das" : "das"} ${interval.start} às ${interval.end}`)
    .join(" e ");
}

function formatWeeklySummary(schedule: BusinessHoursSchedule): string[] {
  const groups: Array<{
    start: BusinessDayKey;
    end: BusinessDayKey;
    intervals: BusinessHoursInterval[];
  }> = [];

  for (const day of BUSINESS_DAY_KEYS) {
    const intervals = schedule[day];
    const lastGroup = groups[groups.length - 1];
    const serialized = JSON.stringify(intervals);
    const lastSerialized = lastGroup ? JSON.stringify(lastGroup.intervals) : null;

    if (lastGroup && serialized === lastSerialized) {
      lastGroup.end = day;
    } else {
      groups.push({
        start: day,
        end: day,
        intervals,
      });
    }
  }

  return groups.map((group) => {
    const dayLabel =
      group.start === group.end
        ? DAY_SHORT_LABELS[group.start]
        : `${DAY_SHORT_LABELS[group.start]} a ${DAY_SHORT_LABELS[group.end]}`;

    if (group.intervals.length === 0) {
      return `${dayLabel}, fechado`;
    }

    return `${dayLabel}, ${formatIntervalsNaturalSummary(group.intervals)}`;
  });
}

function resolveLunchBreakSummary(todayIntervals: BusinessHoursInterval[]): string {
  if (todayIntervals.length <= 1) {
    return "Não";
  }

  const firstGapStart = todayIntervals[0]?.end;
  const firstGapEnd = todayIntervals[1]?.start;
  return firstGapStart && firstGapEnd ? `Sim, das ${firstGapStart} às ${firstGapEnd}` : "Sim";
}

function buildOpeningReference(
  day: BusinessDayKey,
  localDate: string,
  time: string,
  dayOffset: number,
): BusinessOpeningReference {
  return {
    day,
    dayLabel: DAY_LABELS[day],
    localDate,
    time,
    minutes: toMinutes(time),
    dayOffset,
  };
}

function formatRelativeOpening(reference: BusinessOpeningReference | null): string | null {
  if (!reference) {
    return null;
  }

  if (reference.dayOffset === 0) {
    return `hoje às ${reference.time}`;
  }

  if (reference.dayOffset === 1) {
    return `amanhã às ${reference.time}`;
  }

  return `${reference.dayLabel} às ${reference.time}`;
}

export function getBusinessOpenStatus(
  input: {
    weeklySchedule?: unknown;
    assistantTimezone?: string | null;
    companyTimezone?: string | null;
  },
  now: Date = new Date(),
): BusinessOpenStatus {
  const timezone = resolveOfficialTimezone(input);
  const schedule = normalizeBusinessHoursSchedule(input.weeklySchedule);
  const localParts = getLocalDateTimeParts(now, timezone);
  const localMinutes = localParts.hour * 60 + localParts.minute;
  const todayIntervals = schedule[localParts.weekday];
  const currentInterval =
    todayIntervals.find((interval) => {
      const start = toMinutes(interval.start);
      const end = toMinutes(interval.end);
      return localMinutes >= start && localMinutes < end;
    }) ?? null;

  let breakUntil: BusinessOpeningReference | null = null;
  if (!currentInterval && todayIntervals.length > 1) {
    for (let index = 0; index < todayIntervals.length - 1; index += 1) {
      const current = todayIntervals[index];
      const next = todayIntervals[index + 1];
      if (localMinutes >= toMinutes(current.end) && localMinutes < toMinutes(next.start)) {
        breakUntil = buildOpeningReference(
          localParts.weekday,
          formatLocalDateIso(localParts),
          next.start,
          0,
        );
        break;
      }
    }
  }

  let nextOpening: BusinessOpeningReference | null = null;

  if (breakUntil) {
    nextOpening = breakUntil;
  } else {
    for (let offset = 0; offset < BUSINESS_DAY_KEYS.length; offset += 1) {
      const day = shiftDay(localParts.weekday, offset);
      const intervals = schedule[day];
      if (intervals.length === 0) {
        continue;
      }

      if (offset === 0) {
        const nextToday = intervals.find((interval) => toMinutes(interval.start) > localMinutes);
        if (nextToday) {
          nextOpening = buildOpeningReference(
            day,
            formatLocalDateIso(localParts),
            nextToday.start,
            0,
          );
          break;
        }
        continue;
      }

      const referenceDate = new Date(now.getTime() + offset * 24 * 60 * 60 * 1000);
      const referenceParts = getLocalDateTimeParts(referenceDate, timezone);
      nextOpening = buildOpeningReference(
        day,
        formatLocalDateIso(referenceParts),
        intervals[0].start,
        offset,
      );
      break;
    }
  }

  return {
    timezone,
    localDate: formatLocalDateIso(localParts),
    localDateLabel: formatLocalDateLabel(localParts),
    localTime: toTimeString(localMinutes),
    dayOfWeek: localParts.weekday,
    dayLabel: DAY_LABELS[localParts.weekday],
    isOpenNow: Boolean(currentInterval),
    isOnBreak: Boolean(breakUntil),
    currentInterval,
    nextOpening,
    breakUntil,
    todayIntervals,
    todaySummary: formatIntervalsSummary(todayIntervals),
    todayNaturalSummary: formatIntervalsNaturalSummary(todayIntervals),
    weeklySummary: formatWeeklySummary(schedule),
    lunchBreakSummary: resolveLunchBreakSummary(todayIntervals),
    schedule,
  };
}

function buildLocalityLabel(input: {
  city?: string | null;
  state?: string | null;
  cityRegion?: string | null;
}): string | null {
  const city = normalizeString(input.city);
  const state = normalizeString(input.state);
  if (city && state) {
    return `${city}/${state}`;
  }

  return normalizeString(input.cityRegion);
}

function resolveMapsUrl(input: {
  googleMapsUrl?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}): string | null {
  if (normalizeString(input.googleMapsUrl)) {
    return input.googleMapsUrl!.trim();
  }

  if (typeof input.latitude === "number" && typeof input.longitude === "number") {
    return `https://www.google.com/maps/search/?api=1&query=${input.latitude},${input.longitude}`;
  }

  return null;
}

export function buildOfficialBusinessContext(
  input: {
    companyName: string;
    assistantName?: string | null;
    companyTimezone?: string | null;
    assistantTimezone?: string | null;
    description?: string | null;
    businessAddress?: string | null;
    businessCity?: string | null;
    businessState?: string | null;
    businessCityRegion?: string | null;
    businessPostalCode?: string | null;
    googleMapsUrl?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    businessPhone?: string | null;
    businessWhatsapp?: string | null;
    businessWhatsappSupport?: string | null;
    websiteUrl?: string | null;
    weeklySchedule?: unknown;
    aiAlwaysAvailable?: boolean | null;
  },
  now: Date = new Date(),
): OfficialBusinessContext {
  const businessHoursValidationIssueCount = validateBusinessHoursSchedule(
    input.weeklySchedule,
  ).length;
  const businessStatus = getBusinessOpenStatus(
    {
      weeklySchedule: input.weeklySchedule,
      assistantTimezone: input.assistantTimezone ?? null,
      companyTimezone: input.companyTimezone ?? null,
    },
    now,
  );
  const localityLabel = buildLocalityLabel({
    city: input.businessCity ?? null,
    state: input.businessState ?? null,
    cityRegion: input.businessCityRegion ?? null,
  });
  const mapsUrl = resolveMapsUrl({
    googleMapsUrl: input.googleMapsUrl ?? null,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
  });
  const nextOpeningLabel = formatRelativeOpening(businessStatus.nextOpening) ?? "não encontrada";

  const promptLines = [
    "[CONTEXTO OFICIAL DA EMPRESA]",
    `Empresa: ${input.companyName}`,
    `Assistente: ${normalizeString(input.assistantName) ?? "não informado"}`,
    `Timezone da empresa: ${businessStatus.timezone}`,
    `Data/hora local da empresa: ${businessStatus.localDateLabel} ${businessStatus.localTime}`,
    `Dia da semana local: ${businessStatus.dayLabel}`,
    `Status atual de atendimento: ${
      businessStatus.isOnBreak
        ? "INTERVALO DE ALMOÇO"
        : businessStatus.isOpenNow
          ? "ABERTO"
          : "FECHADO"
    }`,
    `Próxima abertura: ${nextOpeningLabel}`,
    `Horário de hoje: ${businessStatus.todaySummary}`,
    `A empresa fecha para almoço hoje? ${businessStatus.lunchBreakSummary}`,
    `IA responde fora do horário: ${input.aiAlwaysAvailable === false ? "Não" : "Sim"}`,
    `Endereço oficial: ${normalizeString(input.businessAddress) ?? "não informado"}`,
    `Cidade/estado oficial: ${localityLabel ?? "não informado"}`,
    `CEP oficial: ${normalizeString(input.businessPostalCode) ?? "não informado"}`,
    `Telefone oficial: ${normalizeString(input.businessPhone) ?? "não informado"}`,
    `WhatsApp principal oficial: ${normalizeString(input.businessWhatsapp) ?? "não informado"}`,
    `WhatsApp assistência oficial: ${normalizeString(input.businessWhatsappSupport) ?? "não informado"}`,
    `Site oficial: ${normalizeString(input.websiteUrl) ?? "não informado"}`,
    `Google Maps oficial: ${mapsUrl ?? "não informado"}`,
    "",
    "Use estas informações como fonte oficial para responder perguntas sobre horário, abertura, fechamento, almoço, endereço, localização, contato, WhatsApp, site e funcionamento.",
    "Prioridade obrigatória das fontes:",
    "1. Dados estruturados oficiais da empresa/assistente",
    "2. Ferramentas internas",
    "3. Base de conhecimento",
    "4. Prompt e regras textuais",
  ];

  return {
    companyName: input.companyName,
    assistantName: normalizeString(input.assistantName),
    companyTimezone: resolveOfficialTimezone({ companyTimezone: input.companyTimezone ?? null }),
    assistantTimezone: isValidIanaTimezone(input.assistantTimezone ?? null)
      ? input.assistantTimezone!.trim()
      : null,
    timezone: businessStatus.timezone,
    description: normalizeString(input.description),
    address: normalizeString(input.businessAddress),
    city: normalizeString(input.businessCity),
    state: normalizeString(input.businessState),
    cityRegion: normalizeString(input.businessCityRegion),
    postalCode: normalizeString(input.businessPostalCode),
    googleMapsUrl: mapsUrl,
    latitude: typeof input.latitude === "number" ? input.latitude : null,
    longitude: typeof input.longitude === "number" ? input.longitude : null,
    phone: normalizeString(input.businessPhone),
    whatsapp: normalizeString(input.businessWhatsapp),
    whatsappSupport: normalizeString(input.businessWhatsappSupport),
    websiteUrl: normalizeString(input.websiteUrl),
    aiRespondsOutsideBusinessHours: input.aiAlwaysAvailable !== false,
    businessHours: businessStatus.schedule,
    businessHoursConfigurationValid: businessHoursValidationIssueCount === 0,
    businessHoursValidationIssueCount,
    businessStatus,
    localityLabel,
    promptBlock: promptLines.join("\n"),
    dataPriorityInstruction:
      "Dados estruturados oficiais têm prioridade sobre ferramentas, base de conhecimento e prompt textual.",
  };
}

function normalizeQuestion(question: string): string {
  return question
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function isHoursQuestion(question: string): boolean {
  const normalized = normalizeQuestion(question);
  return [
    "horario",
    "atendimento",
    "aberto",
    "aberta",
    "abertos",
    "abertas",
    "funciona",
    "funcionam",
    "abre",
    "abrem",
    "fecha",
    "almoco",
    "intervalo",
    "ate que horas",
    "que horas",
  ].some((term) => normalized.includes(term));
}

function isAddressQuestion(question: string): boolean {
  const normalized = normalizeQuestion(question);
  return ["endereco", "localizacao", "onde fica", "como chegar", "maps", "google maps"].some(
    (term) => normalized.includes(term),
  );
}

function isWebsiteQuestion(question: string): boolean {
  const normalized = normalizeQuestion(question);
  return ["site", "website", "pagina", "link"].some((term) => normalized.includes(term));
}

function isContactQuestion(question: string): boolean {
  const normalized = normalizeQuestion(question);
  return ["telefone", "whatsapp", "contato", "numero", "número", "celular"].some((term) =>
    normalized.includes(term),
  );
}

function isSpecificPersonContactQuestion(question: string): boolean {
  const normalized = normalizeQuestion(question);
  const referencesSpecificOwner =
    /\b(whatsapp|telefone|numero|número|contato)\s+d[oa]s?\s+[a-z]/i.test(normalized);
  const keepsBusinessScope = [
    "empresa",
    "loja",
    "assistencia",
    "assistencia tecnica",
    "suporte",
    "tecnica",
  ].some((term) => normalized.includes(term));

  return referencesSpecificOwner && !keepsBusinessScope;
}

function buildTodayHoursSentence(context: OfficialBusinessContext): string {
  const todayIntervals = context.businessStatus.todayIntervals;
  if (todayIntervals.length === 0) {
    return "Hoje não há atendimento.";
  }

  if (todayIntervals.length === 1) {
    return `Hoje atendemos das ${todayIntervals[0].start} às ${todayIntervals[0].end} e não fechamos para almoço.`;
  }

  return `Hoje atendemos ${todayIntervals
    .map((interval) => `das ${interval.start} às ${interval.end}`)
    .join(" e ")}.`;
}

function buildOpenNowAnswer(context: OfficialBusinessContext): string {
  const status = context.businessStatus;
  if (status.isOnBreak && status.breakUntil) {
    return `No momento estamos no intervalo de almoço. Retornamos o atendimento às ${status.breakUntil.time}.`;
  }

  if (status.isOpenNow) {
    return `Sim, estamos abertos agora. ${buildTodayHoursSentence(context)}`;
  }

  if (status.todayIntervals.length > 0 && status.nextOpening?.dayOffset === 0) {
    return `No momento ainda estamos fechados. Nosso atendimento hoje começa às ${status.nextOpening.time} e vai até às ${status.todayIntervals.at(-1)?.end}, no horário local de ${context.localityLabel ?? context.timezone}.`;
  }

  return `No momento estamos fechados. Nosso próximo atendimento será ${formatRelativeOpening(status.nextOpening) ?? "em breve"}.`;
}

function buildLunchAnswer(context: OfficialBusinessContext): string {
  const intervals = context.businessStatus.todayIntervals;
  if (intervals.length <= 1) {
    return "Não, não fechamos para almoço.";
  }

  const firstGapStart = intervals[0]?.end;
  const firstGapEnd = intervals[1]?.start;
  if (firstGapStart && firstGapEnd) {
    return `Sim, fechamos para almoço das ${firstGapStart} às ${firstGapEnd}.`;
  }

  return "Sim, fechamos para almoço.";
}

function buildHoursAnswer(question: string, context: OfficialBusinessContext): string {
  const normalized = normalizeQuestion(question);

  if (!Object.values(context.businessHours).some((intervals) => intervals.length > 0)) {
    return "Não tenho o horário confirmado no momento. Vou precisar que a equipe confirme essa informação.";
  }

  const formatTime = (value: string): string => {
    const [hour, minute] = value.split(":");
    return minute === "00" ? `${hour}h` : `${hour}h${minute}`;
  };
  const formatIntervals = (intervals: BusinessHoursInterval[]): string =>
    intervals
      .map((interval) => `das ${formatTime(interval.start)} às ${formatTime(interval.end)}`)
      .join(" e ");
  const requestedDay = findRequestedBusinessDay(normalized);

  if (
    normalized.includes("aberto agora") ||
    normalized.includes("aberta agora") ||
    normalized.includes("estao abertos") ||
    normalized.includes("estão abertos") ||
    normalized.includes("funcionando agora")
  ) {
    return buildOpenNowAnswer(context);
  }

  if (normalized.includes("hoje")) {
    const intervals = context.businessStatus.todayIntervals;
    return intervals.length > 0
      ? `Hoje, ${context.businessStatus.dayLabel}, atendemos ${formatIntervals(intervals)}.`
      : `Hoje, ${context.businessStatus.dayLabel}, não há atendimento.`;
  }

  // A day explicitly named by the customer is authoritative over generic
  // "abre"/"fecha" wording. This prevents asking about Saturday from being
  // evaluated against the current day.
  if (requestedDay) {
    const intervals = context.businessHours[requestedDay];
    const dayLabel: Record<BusinessDayKey, string> = {
      monday: "segundas-feiras",
      tuesday: "terças-feiras",
      wednesday: "quartas-feiras",
      thursday: "quintas-feiras",
      friday: "sextas-feiras",
      saturday: "sábados",
      sunday: "domingos",
    };
    return intervals.length > 0
      ? `Sim. Aos ${dayLabel[requestedDay]} atendemos ${formatIntervals(intervals)}.`
      : `Não, aos ${dayLabel[requestedDay]} estamos fechados.`;
  }

  if (normalized.includes("almoco") || normalized.includes("intervalo")) {
    return buildLunchAnswer(context);
  }

  if (normalized.includes("abre")) {
    const nextOpening = context.businessStatus.nextOpening;
    if (nextOpening?.dayOffset === 0) {
      return `Hoje abrimos às ${nextOpening.time}. ${buildTodayHoursSentence(context)}`;
    }

    return `Nosso próximo horário de abertura será ${formatRelativeOpening(nextOpening) ?? "em breve"}.`;
  }

  if (
    normalized.includes("fecha") ||
    normalized.includes("ate que horas") ||
    normalized.includes("até que horas")
  ) {
    const lastInterval = context.businessStatus.todayIntervals.at(-1);
    if (lastInterval) {
      return `Hoje atendemos até às ${lastInterval.end}. ${buildTodayHoursSentence(context)}`;
    }
  }

  const weekdays = BUSINESS_DAY_KEYS.slice(0, 5);
  const weekdayIntervals = context.businessHours.monday;
  const weekdaysMatch = weekdays.every(
    (day) => JSON.stringify(context.businessHours[day]) === JSON.stringify(weekdayIntervals),
  );
  const parts: string[] = [];
  if (weekdaysMatch) {
    parts.push(
      weekdayIntervals.length > 0
        ? `de segunda a sexta, ${formatIntervals(weekdayIntervals)}`
        : "de segunda a sexta, não há atendimento",
    );
  } else {
    for (const day of weekdays) {
      const intervals = context.businessHours[day];
      parts.push(
        intervals.length > 0
          ? `${DAY_LABELS[day]}, ${formatIntervals(intervals)}`
          : `${DAY_LABELS[day]}, fechado`,
      );
    }
  }
  const saturday = context.businessHours.saturday;
  parts.push(
    saturday.length > 0 ? `aos sábados, ${formatIntervals(saturday)}` : "aos sábados, fechado",
  );
  const sunday = context.businessHours.sunday;
  parts.push(
    sunday.length > 0
      ? `aos domingos, ${formatIntervals(sunday)}`
      : "aos domingos estamos fechados",
  );
  return `Atendemos ${parts.join("; ")}.`;
}

export type DeterministicBusinessHoursResponse = {
  answer: string;
  requestedScheduleScope: "weekly" | "specific_day" | "today" | "open_now";
  deterministicBranch:
    "MISSING_SCHEDULE" | "WEEKLY_SUMMARY" | "SPECIFIC_DAY" | "TODAY" | "OPEN_NOW" | "CLOSED_NOW";
  requestedDay: BusinessDayKey | null;
  timezone: string;
  scheduleSource: "OFFICIAL_STRUCTURED_SCHEDULE";
  missingScheduleConfiguration: boolean;
  scheduleValidationIssueCount: number;
  normalizedScheduleDayCount: number;
  normalizedScheduleIntervalCount: number;
  isOpenNow: boolean | null;
};

/**
 * Canonical factual responder for Runtime V2 business-hours turns. It never
 * delegates schedule wording or day resolution to a model.
 */
export function buildDeterministicBusinessHoursResponse(
  question: string,
  context: OfficialBusinessContext | null | undefined,
): DeterministicBusinessHoursResponse {
  const normalized = normalizeQuestion(question);
  const requestedDay = findRequestedBusinessDay(normalized) ?? null;
  const requestedScheduleScope =
    /(?:aberto|aberta|funcionando).*(?:agora)|(?:agora).*(?:aberto|aberta|funcionando)/.test(
      normalized,
    )
      ? "open_now"
      : normalized.includes("hoje")
        ? "today"
        : requestedDay
          ? "specific_day"
          : "weekly";
  const missingScheduleConfiguration =
    !context ||
    !context.businessHoursConfigurationValid ||
    !Object.values(context.businessHours).some((intervals) => intervals.length > 0);
  const normalizedScheduleDayCount = context
    ? Object.values(context.businessHours).filter((intervals) => intervals.length > 0).length
    : 0;
  const normalizedScheduleIntervalCount = context
    ? Object.values(context.businessHours).reduce((total, intervals) => total + intervals.length, 0)
    : 0;
  const deterministicBranch = missingScheduleConfiguration
    ? "MISSING_SCHEDULE"
    : requestedScheduleScope === "weekly"
      ? "WEEKLY_SUMMARY"
      : requestedScheduleScope === "specific_day"
        ? "SPECIFIC_DAY"
        : requestedScheduleScope === "today"
          ? "TODAY"
          : context?.businessStatus.isOpenNow
            ? "OPEN_NOW"
            : "CLOSED_NOW";

  return {
    answer:
      context && context.businessHoursConfigurationValid
        ? buildHoursAnswer(question, context)
        : "Não tenho o horário confirmado no momento. Vou precisar que a equipe confirme essa informação.",
    requestedScheduleScope,
    deterministicBranch,
    requestedDay,
    timezone: context?.timezone ?? "UNAVAILABLE",
    scheduleSource: "OFFICIAL_STRUCTURED_SCHEDULE",
    missingScheduleConfiguration,
    scheduleValidationIssueCount: context?.businessHoursValidationIssueCount ?? 0,
    normalizedScheduleDayCount,
    normalizedScheduleIntervalCount,
    isOpenNow:
      requestedScheduleScope === "open_now" ? (context?.businessStatus.isOpenNow ?? null) : null,
  };
}

function buildAddressAnswer(context: OfficialBusinessContext): string | null {
  const parts = [
    context.address,
    context.localityLabel,
    context.postalCode ? `CEP ${context.postalCode}` : null,
  ].filter((value): value is string => Boolean(value));

  if (parts.length === 0) {
    return null;
  }

  const mapsSuffix = context.googleMapsUrl ? ` Google Maps: ${context.googleMapsUrl}` : "";
  return `Nosso endereço é ${parts.join(", ")}.${mapsSuffix}`;
}

function buildContactAnswer(question: string, context: OfficialBusinessContext): string | null {
  const normalized = normalizeQuestion(question);
  const asksWhatsapp = normalized.includes("whatsapp");
  const asksPhone =
    normalized.includes("telefone") ||
    normalized.includes("fone") ||
    normalized.includes("ligacao") ||
    normalized.includes("ligação");
  const asksSupport =
    normalized.includes("assistencia") ||
    normalized.includes("assistência") ||
    normalized.includes("tecnica") ||
    normalized.includes("técnica");
  const asksContacts =
    normalized.includes("contato") ||
    normalized.includes("contatos") ||
    normalized.includes("fale conosco");

  if (asksPhone && !asksWhatsapp && !asksContacts && context.phone) {
    return `O telefone da loja é ${context.phone}.`;
  }

  if (asksWhatsapp && !asksPhone && !asksContacts) {
    if (asksSupport && context.whatsappSupport) {
      return `O WhatsApp da assistência técnica é ${context.whatsappSupport}.`;
    }

    if (context.whatsapp && context.whatsappSupport) {
      return `Nosso WhatsApp principal é ${context.whatsapp} e o da assistência é ${context.whatsappSupport}.`;
    }

    if (context.whatsapp) {
      return `Nosso WhatsApp principal é ${context.whatsapp}.`;
    }

    if (context.whatsappSupport) {
      return `Nosso WhatsApp de assistência é ${context.whatsappSupport}.`;
    }
  }

  const lines = [
    context.phone ? `Telefone: ${context.phone}` : null,
    context.whatsapp ? `WhatsApp principal: ${context.whatsapp}` : null,
    context.whatsappSupport ? `WhatsApp da assistência técnica: ${context.whatsappSupport}` : null,
  ].filter((value): value is string => Boolean(value));

  return lines.length > 0 ? `Nossos contatos oficiais são: ${lines.join(" ")}.` : null;
}

export function buildOutsideBusinessHoursReply(context: OfficialBusinessContext): string {
  return `No momento estamos fora do horário oficial de atendimento, mas posso adiantar algumas informações e registrar sua solicitação. Nosso próximo atendimento será ${formatRelativeOpening(context.businessStatus.nextOpening) ?? "em breve"}.`;
}

export function buildStructuredBusinessAnswer(
  question: string,
  context: OfficialBusinessContext | null | undefined,
): { answer: string; sourceTitle: string } | null {
  if (!context) {
    return null;
  }

  if (isHoursQuestion(question)) {
    return {
      answer: buildHoursAnswer(question, context),
      sourceTitle: "Dados oficiais da empresa",
    };
  }

  if (isAddressQuestion(question)) {
    const answer = buildAddressAnswer(context);
    return answer
      ? {
          answer,
          sourceTitle: "Endereço oficial da empresa",
        }
      : null;
  }

  if (isWebsiteQuestion(question) && context.websiteUrl) {
    return {
      answer: `Nosso site oficial é ${context.websiteUrl}.`,
      sourceTitle: "Site oficial da empresa",
    };
  }

  if (isContactQuestion(question)) {
    if (isSpecificPersonContactQuestion(question)) {
      return null;
    }

    const answer = buildContactAnswer(question, context);
    return answer
      ? {
          answer,
          sourceTitle: "Contatos oficiais da empresa",
        }
      : null;
  }

  return null;
}
