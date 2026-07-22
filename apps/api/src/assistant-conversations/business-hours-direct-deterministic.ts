import { normalizeIntentText } from "../intent-router/intent-routing";

export type DirectBusinessHoursScope =
  "WEEKLY_SUMMARY" | "SPECIFIC_DAY" | "TODAY" | "OPEN_NOW" | "LUNCH_BREAK";

export type DirectBusinessHoursDetection =
  | {
      kind: "BUSINESS_HOURS";
      scope: DirectBusinessHoursScope;
    }
  | {
      kind: "BLOCKED_NON_BUSINESS_TEMPORAL";
      category: "TECHNICIAN" | "ORDER" | "DELIVERY" | "APPOINTMENT" | "SYSTEM" | "OTHER";
    }
  | { kind: "NO_MATCH" };

export type DirectBusinessHoursBlockedCategory =
  "TECHNICIAN" | "ORDER" | "DELIVERY" | "APPOINTMENT" | "SYSTEM" | "OTHER";

const DAYS = "segunda|terca|terça|quarta|quinta|sexta|sabado|sábado|domingo";
const BUSINESS_SUBJECT =
  "voc(?:e|ê)s|vcs|a loja|loja|a empresa|empresa|o estabelecimento|estabelecimento|o atendimento|atendimento";
const OPERATION_VERB =
  "funciona(?:m|mento)?|atend(?:em|imento|endo)|abre(?:m)?|fecha(?:m|ram)?|(?:est|t)(?:a|á|ao|ão)\\s+abert[oa]s?|(?:est|t)(?:a|á|ao|ão)\\s+fechad[oa]s?";
const NON_BUSINESS_CONTEXT =
  "pedido|entrega|encomenda|tecnico|técnico|visita|instalacao|instalação|manutencao|manutenção|coleta|agendamento|consulta|reuniao|reunião|compromisso|chamada|chamado|suporte|orcamento|orçamento|pagamento|vencimento|transporte|motorista|carga|servico|serviço|ordem|sistema|caixa|cliente";
const NON_BUSINESS_TEMPORAL_ANCHOR =
  "que horas|qual(?: o)? horario|quando|que dia|hoje|amanha|ontem|segunda|terca|quarta|quinta|sexta|sabado|domingo|fim de semana|final de semana|finais de semana|manha|tarde|noite|depois do almoco|previsao|prazo|acontece|comeca|sera|ficou|as\\s*\\d{1,2}(?::\\d{2})?|\\d{1,2}:\\d{2}|\\d{1,2}[/-]\\d{1,2}(?:[/-]\\d{2,4})?";

function detectNonBusinessTemporalCategory(
  text: string,
): DirectBusinessHoursBlockedCategory | null {
  const hasTemporalAnchor = new RegExp(`\\b(?:${NON_BUSINESS_TEMPORAL_ANCHOR})\\b`).test(text);
  const hasLegacyTemporalStatus = /\b(?:aberto|fechado)\b/.test(text);
  if (!hasTemporalAnchor && !hasLegacyTemporalStatus) {
    return null;
  }
  if (/\b(?:tecnico|instalador|instalacao|manutencao|visita)\b/.test(text)) return "TECHNICIAN";
  if (/\b(?:pedido|encomenda)\b/.test(text)) return "ORDER";
  if (/\b(?:entrega|coleta|motorista|carga|transporte)\b/.test(text)) return "DELIVERY";
  if (/\b(?:agendamento|consulta|reuniao|chamada)\b/.test(text)) return "APPOINTMENT";
  if (/\b(?:sistema|caixa|suporte|chamado)\b/.test(text)) return "SYSTEM";
  if (new RegExp("\\b(?:" + NON_BUSINESS_CONTEXT + ")\\b").test(text)) return "OTHER";
  return null;
}

export function isDirectBusinessHoursEnabled(env = process.env): boolean {
  return env.BUSINESS_HOURS_DIRECT_DETERMINISTIC_ENABLED === "true";
}

export function isDirectBusinessHoursBindingAllowed(input: {
  assistantId: string;
  accountId: string | null | undefined;
  inboxId: string | null | undefined;
  env?: NodeJS.ProcessEnv;
}): boolean {
  if (!isDirectBusinessHoursEnabled(input.env)) return false;
  const accountId = input.accountId?.trim();
  const inboxId = input.inboxId?.trim();
  if (!accountId || !inboxId) return false;
  const bindings = (input.env ?? process.env).BUSINESS_HOURS_DIRECT_DETERMINISTIC_BINDINGS ?? "";
  return bindings
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .some((binding) => binding === `${input.assistantId}:${accountId}:${inboxId}`);
}

export function hasExplicitHumanRequest(message: string): boolean {
  const text = normalizeIntentText(message);
  return /\b(?:humano|humana|pessoa|atendente|atendimento humano|transferir|transferencia|falar com alguem|falar com alguém)\b/.test(
    text,
  );
}

export function detectDirectBusinessHours(message: string): DirectBusinessHoursScope | null {
  const text = normalizeIntentText(message);
  if (!text) return null;
  if (new RegExp(`\\b(?:${NON_BUSINESS_CONTEXT})\\b`).test(text)) return null;

  const lunch = /(?:almoco|meio dia|intervalo)/.test(text);
  const dayMatches = text.match(new RegExp(`\\b(?:${DAYS})\\b`, "g")) ?? [];
  const hasDay = dayMatches.length > 0;
  const hasMultipleDays = dayMatches.length > 1;
  const weekend = /(?:fim|final|finais) de semana|sabado e domingo/.test(text);
  const subjectAndOperation = new RegExp(
    `\\b(?:${BUSINESS_SUBJECT})\\b[^?.!]{0,36}\\b(?:${OPERATION_VERB})\\b`,
  ).test(text);
  const operationForDay = new RegExp(
    `\\b(?:${OPERATION_VERB})\\b[^?.!]{0,24}\\b(?:${DAYS})\\b|\\b(?:${DAYS})\\b[^?.!]{0,24}\\b(?:${OPERATION_VERB})\\b`,
  ).test(text);
  const explicitSchedule = new RegExp(
    `\\bexpediente\\b|\\b(?:horario|horário|hrs?)\\s+(?:de|da|do|na|no|para)\\s+(?:${BUSINESS_SUBJECT}|${DAYS})\\b|\\bhorario\\s+de\\s+(?:atendimento|funcionamento|almoco|almoço)\\b`,
  ).test(text);
  const multiDayScheduleQuestion =
    hasMultipleDays && /\b(?:qual(?:is)?\s+(?:o|os)\s+)?horarios?\b/.test(text);
  const weekendScheduleQuestion =
    weekend && /\b(?:qual(?: o)?\s+horario|horarios?|expediente|atendimento)\b/.test(text);
  const questionWithBusinessSubject = new RegExp(
    `\\b(?:que horas|qual(?: o)? horario|quando|ate que horas|até que horas)\\b[^?.!]{0,20}\\b(?:${BUSINESS_SUBJECT})\\b`,
  ).test(text);
  const todayOperation =
    /\bhoje\b/.test(text) && new RegExp(`\\b(?:${OPERATION_VERB})\\b`).test(text);
  const openNow =
    /\b(?:agora|ainda)\b/.test(text) &&
    (subjectAndOperation ||
      /\b(?:ainda\s+estao\s+atendendo|ainda\s+estão\s+atendendo)\b/.test(text));
  const explicitLunch =
    lunch &&
    /(?:fecham?\s+para\s+(?:o\s+)?almoco|horario\s+de\s+almoco|param\s+(?:no|para o)\s+almoco|fecham?\s+ao\s+meio\s+dia)/.test(
      text,
    );
  const resumption = /\b(?:volta(?:m)?|retorna(?:m)?|reabre(?:m)?|abre\s+de\s+novo)\b/.test(text);
  const resumptionTimeCue =
    /\b(?:que horas|quando)\b|\b(?:as|às)\s*\d{1,2}(?::\d{2})?\b|depois do almoco/.test(text);
  const subjectAndResumption = new RegExp(
    `\\b(?:${BUSINESS_SUBJECT})\\b[^?.!]{0,36}\\b(?:volta(?:m)?|retorna(?:m)?|reabre(?:m)?|abre\\s+de\\s+novo)\\b`,
  ).test(text);
  const explicitServiceResumption = /\bvoltam?\s+a\s+atend/.test(text);
  const explicitReopening = /\b(?:reabre(?:m)?|abre\s+de\s+novo)\b/.test(text);

  if (explicitLunch || (lunch && hasDay && operationForDay)) return "LUNCH_BREAK";
  if (resumption) {
    if (hasDay && resumptionTimeCue) return "SPECIFIC_DAY";
    if (/\bhoje\b/.test(text) && (resumptionTimeCue || subjectAndResumption)) return "TODAY";
    if (lunch && (resumptionTimeCue || subjectAndResumption || explicitServiceResumption))
      return "LUNCH_BREAK";
    if (
      (subjectAndResumption || explicitServiceResumption || explicitReopening) &&
      resumptionTimeCue
    )
      return "LUNCH_BREAK";
  }
  if (openNow) return "OPEN_NOW";
  if (todayOperation) return "TODAY";
  if (
    (hasDay || weekend) &&
    (explicitSchedule ||
      operationForDay ||
      subjectAndOperation ||
      multiDayScheduleQuestion ||
      weekendScheduleQuestion ||
      (weekend && /\b(?:funciona|funcionam|atendem|abre|abrem|fecha|fecham)/.test(text)))
  )
    return "SPECIFIC_DAY";
  if (explicitSchedule || questionWithBusinessSubject || subjectAndOperation)
    return "WEEKLY_SUMMARY";
  return null;
}

export function detectDirectBusinessHoursDecision(message: string): DirectBusinessHoursDetection {
  const scope = detectDirectBusinessHours(message);
  if (scope) return { kind: "BUSINESS_HOURS", scope };

  const text = normalizeIntentText(message);
  const category = detectNonBusinessTemporalCategory(text);
  return category ? { kind: "BLOCKED_NON_BUSINESS_TEMPORAL", category } : { kind: "NO_MATCH" };
}
