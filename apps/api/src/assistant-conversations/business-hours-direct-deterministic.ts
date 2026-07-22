import { normalizeIntentText } from "../intent-router/intent-routing";

export type DirectBusinessHoursScope =
  "WEEKLY_SUMMARY" | "SPECIFIC_DAY" | "TODAY" | "OPEN_NOW" | "LUNCH_BREAK";

const DAYS = "segunda|terca|terça|quarta|quinta|sexta|sabado|sábado|domingo";
const HOUR_TERMS =
  "horario|horário|hrs?|que horas|expediente|funciona(?:m|mento)?|atend(?:em|imento|endo)|abre(?:m)?|fecha(?:m|ram)?|abert[oa]s?|fechad[oa]s?";

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
  if (
    /(?:prazo de entrega|quanto tempo demora|horario do meu pedido|tecnico chega|valor|endereco|telefone|quero comprar|preciso de suporte|sistema esta fechado|caixa fechou|abrir uma empresa)/.test(
      text,
    )
  )
    return null;
  const lunch = /(?:almoco|meio dia|intervalo)/.test(text);
  const hasDay = new RegExp(`\\b(?:${DAYS})\\b`).test(text);
  const hasHourTerm = new RegExp(`\\b(?:${HOUR_TERMS})\\b`).test(text);
  const weekend = /(?:fim de semana|finais de semana|sabado e domingo)/.test(text);
  const now = /(?:agora|ainda .*atend|ja fech|já fech|esta aberto|estao abertos)/.test(text);
  if (lunch && (hasHourTerm || hasDay || /(?:param|fecham)/.test(text))) return "LUNCH_BREAK";
  if (now && (hasHourTerm || /(?:atend|funcion)/.test(text))) return "OPEN_NOW";
  if (/\bhoje\b/.test(text) && hasHourTerm) return "TODAY";
  if ((hasDay || weekend) && (hasHourTerm || /(?:como funciona|funcionam)/.test(text)))
    return "SPECIFIC_DAY";
  if (hasHourTerm) return "WEEKLY_SUMMARY";
  return null;
}
