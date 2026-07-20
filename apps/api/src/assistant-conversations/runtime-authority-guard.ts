import type { AssistantRuntimeSource } from "../assistants/assistant-runtime";
import type { OfficialBusinessContext } from "../assistants/official-business-context";

export type RuntimeAuthorityGuardResult = {
  answer: string;
  blockedCategories: string[];
  unsupportedClaimDetected: boolean;
  generatedClaimCategory: string | null;
  finalSafeResponseCategory: string | null;
  authorityCategorySource:
    | "triage_outcome"
    | "explicit_intent"
    | "normalized_intent"
    | "selected_flow"
    | "official_context"
    | "claim"
    | "none";
  replacementReason: string | null;
  triageResponseProtected: boolean;
  authorityConflictDetected: boolean;
  authorityConflictCategories: string[];
  winningSourceTypes: string[];
  rejectedSourceTypes: string[];
};

export type ExpectedAuthorityCategory =
  | "price"
  | "availability"
  | "booking"
  | "business_hours"
  | "pickup"
  | "address"
  | "official_contact"
  | "technical_evaluation"
  | "generic_unavailable"
  | "exceptionRequest"
  | null;

export type OfficialHoursEvaluation = {
  evaluated: boolean;
  requestedDay: string | null;
  requestedTime: string | null;
  requestedDayOpen: boolean | null;
  requestedTimeWithinHours: boolean | null;
};

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function hasOfficialSchedule(context: OfficialBusinessContext): boolean {
  return Object.values(context.businessHours).some((intervals) => intervals.length > 0);
}

function hasSourceForCategory(sources: AssistantRuntimeSource[], category: string): boolean {
  const normalizedCategory = normalize(category);
  return sources.some((source) => {
    const sourceText = normalize(`${source.id} ${source.title}`);
    return (
      sourceText.includes(normalizedCategory) ||
      (source.id === "official-structured-data" &&
        ["address", "businesshours", "business_hours", "official_contact", "contact"].includes(
          normalizedCategory,
        ))
    );
  });
}

function safeUnavailable(category: string): string {
  switch (category) {
    case "price":
      return "Não tenho um valor confirmado para esse serviço. Posso verificar para você.";
    case "pickup":
      return "Preciso confirmar se a retirada está disponível para esse atendimento.";
    case "availability":
      return "Preciso confirmar se existe disponibilidade para esse atendimento.";
    case "booking":
      return "Não consigo confirmar esse agendamento sem consultar a agenda.";
    case "business_hours":
      return "Esse horário está fora do funcionamento oficial informado.";
    case "address":
      return "Preciso confirmar o endereço oficial antes de informar esse dado.";
    case "official_contact":
      return "O contato oficial não está disponível no contexto. Posso encaminhar para confirmação da equipe.";
    case "technical_evaluation":
      return "Sem problema. Os dados informados foram registrados, e o detalhe técnico poderá ser verificado durante a avaliação ou confirmado pela equipe.";
    case "exceptionRequest":
      return "Preciso confirmar essa exceção com um atendente antes de prometer esse atendimento.";
    default:
      return "Preciso confirmar essa informação antes de responder com segurança.";
  }
}

const WEEKDAY_ALIASES: Array<[string, string]> = [
  ["domingo", "sunday"],
  ["segunda", "monday"],
  ["terca", "tuesday"],
  ["quarta", "wednesday"],
  ["quinta", "thursday"],
  ["sexta", "friday"],
  ["sabado", "saturday"],
];

function parseRequestedTime(message: string): string | null {
  const match = message.match(/\b(\d{1,2})(?::(\d{2}))?\s*(?:h|hrs?|horas?)?\b/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2] ?? "0");
  if (hour > 23 || minute > 59) return null;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function evaluateRequestedBusinessHours(input: {
  currentMessage: string;
  officialBusinessContext?: OfficialBusinessContext | null;
}): OfficialHoursEvaluation {
  const message = normalize(input.currentMessage);
  const requestedDay = WEEKDAY_ALIASES.find(([alias]) => message.includes(alias))?.[1] ?? null;
  const requestedTime = parseRequestedTime(message);
  if (!requestedDay || !input.officialBusinessContext) {
    return {
      evaluated: false,
      requestedDay,
      requestedTime,
      requestedDayOpen: null,
      requestedTimeWithinHours: null,
    };
  }

  const intervals = input.officialBusinessContext.businessHours[
    requestedDay as keyof OfficialBusinessContext["businessHours"]
  ] ?? [];
  const requestedDayOpen = intervals.length > 0;
  if (!requestedTime) {
    return {
      evaluated: true,
      requestedDay,
      requestedTime: null,
      requestedDayOpen,
      requestedTimeWithinHours: null,
    };
  }

  const requestedMinutes = Number(requestedTime.slice(0, 2)) * 60 + Number(requestedTime.slice(3));
  const requestedTimeWithinHours = intervals.some((interval) => {
    const [startHour, startMinute] = interval.start.split(":").map(Number);
    const [endHour, endMinute] = interval.end.split(":").map(Number);
    return (
      requestedMinutes >= startHour * 60 + startMinute &&
      requestedMinutes <= endHour * 60 + endMinute
    );
  });
  return {
    evaluated: true,
    requestedDay,
    requestedTime,
    requestedDayOpen,
    requestedTimeWithinHours,
  };
}

export function deriveExpectedAuthorityCategory(input: {
  currentMessage: string;
  normalizedIntent?: string | null;
  selectedFlowKey?: string | null;
  conversationalOutcome?: ExpectedAuthorityCategory;
  officialBusinessContext?: OfficialBusinessContext | null;
}): {
  category: ExpectedAuthorityCategory;
  source: RuntimeAuthorityGuardResult["authorityCategorySource"];
  officialHours: OfficialHoursEvaluation;
} {
  const officialHours = evaluateRequestedBusinessHours(input);
  if (input.conversationalOutcome === "technical_evaluation") {
    return { category: "technical_evaluation", source: "triage_outcome", officialHours };
  }

  const message = normalize(input.currentMessage);
  if (/(?:telefone|numero|whatsapp|contato|como falar com voces|como falar com a empresa)/.test(message)) {
    return { category: "official_contact", source: "explicit_intent", officialHours };
  }
  if (/(?:preco|valor|quanto custa|quanto fica|orcamento|custa)/.test(message)) {
    return { category: "price", source: "explicit_intent", officialHours };
  }
  if (
    officialHours.evaluated &&
    (officialHours.requestedDayOpen === false || officialHours.requestedTimeWithinHours === false)
  ) {
    return { category: "business_hours", source: "official_context", officialHours };
  }
  if (
    /(?:agendar|agendamento|marcar|reserva|domingo|segunda|terca|quarta|quinta|sexta|sabado)\b/.test(message) &&
    /(?:\b(?:as|a)\s*\d{1,2}|agendar|agendamento|marcar|reserva|horario)/.test(message)
  ) {
    return { category: "booking", source: "explicit_intent", officialHours };
  }
  if (/(?:para agora|imediato|disponibilidade|tem vaga|tem horario)/.test(message)) {
    return { category: "availability", source: "explicit_intent", officialHours };
  }
  const hasBusinessHoursRequest = /(?:horario|funcionamento|abrem|aberto|fechado)/.test(message);
  const hasCompetingOperationalRequest =
    /(?:busca|buscar|retirada|retirar|coleta|domicilio|endereco|onde fica|localizacao|como chegar|suporte|assistencia tecnica|notebook|computador|orcamento|preco|valor|telefone|whatsapp|contato)/.test(
      message,
    );
  if (hasBusinessHoursRequest && !hasCompetingOperationalRequest) {
    return { category: "business_hours", source: "explicit_intent", officialHours };
  }
  if (/(?:busca|buscar|retirada|retirar|coleta|domicilio)/.test(message)) {
    return { category: "pickup", source: "explicit_intent", officialHours };
  }
  if (/(?:endereco|onde fica|localizacao|como chegar)/.test(message)) {
    return { category: "address", source: "explicit_intent", officialHours };
  }
  if (/(?:esperar|aguardar|depois de fechar|apos o horario)/.test(message)) {
    return { category: "exceptionRequest", source: "explicit_intent", officialHours };
  }

  const normalizedIntent = normalize(input.normalizedIntent ?? "");
  if (normalizedIntent.includes("price") || normalizedIntent.includes("orcamento")) {
    return { category: "price", source: "normalized_intent", officialHours };
  }
  if (normalizedIntent.includes("booking") || normalizedIntent.includes("schedule")) {
    return { category: "booking", source: "normalized_intent", officialHours };
  }
  if (normalizedIntent.includes("availability")) {
    return { category: "availability", source: "normalized_intent", officialHours };
  }

  const flow = normalize(input.selectedFlowKey ?? "");
  if (flow.includes("price") || flow.includes("orcamento")) {
    return { category: "price", source: "selected_flow", officialHours };
  }
  if (flow.includes("pickup") || flow.includes("coleta")) {
    return { category: "pickup", source: "selected_flow", officialHours };
  }
  if (flow.includes("company") || flow.includes("informacoes")) {
    return { category: "address", source: "selected_flow", officialHours };
  }
  return { category: null, source: "none", officialHours };
}

function isHistoricalCustomerAmountReference(answer: string): boolean {
  const customerReference =
    /(?:voce|cliente|usuario).{0,60}(?:informou|disse|mencionou|pagou|relatou|havia pago|antes)/.test(
      answer,
    );
  const currentPriceStatement = /(?:valor|preco).{0,24}\b\d|(?:custa|fica|sai)\s+\d/.test(answer);
  return customerReference && !currentPriceStatement;
}

export function validateV1AnswerAuthority(input: {
  answer: string;
  currentMessage: string;
  sources: AssistantRuntimeSource[];
  officialBusinessContext: OfficialBusinessContext;
  flowText?: string | null;
  normalizedIntent?: string | null;
  selectedFlowId?: string | null;
  selectedFlowKey?: string | null;
  expectedAuthorityCategory?: ExpectedAuthorityCategory;
  conversationalOutcome?: ExpectedAuthorityCategory;
  triageExitReason?: string | null;
  customerUnableToAnswer?: boolean;
  officialHoursEvaluation?: OfficialHoursEvaluation;
  officialContactAvailable?: boolean;
  currentCustomerIntentSource?: "CUSTOMER_TEXT" | "TRANSCRIPTION";
  currentTurnIsExplicitIntent?: boolean;
}): RuntimeAuthorityGuardResult {
  const answer = input.answer.trim();
  const normalizedAnswer = normalize(answer);
  const normalizedQuestion = normalize(input.currentMessage);
  const blockedCategories: string[] = [];
  const winningSourceTypes: string[] = [];
  const rejectedSourceTypes: string[] = [];
  let replacementCategory: ExpectedAuthorityCategory = null;
  let replacementReason: string | null = null;
  let authorityConflictDetected = false;
  const authorityConflictCategories: string[] = [];
  const derivedExpected = deriveExpectedAuthorityCategory({
    currentMessage: input.currentMessage,
    normalizedIntent: input.normalizedIntent,
    selectedFlowKey: input.selectedFlowKey,
    conversationalOutcome: input.conversationalOutcome,
    officialBusinessContext: input.officialBusinessContext,
  });
  const expectedCategory = input.expectedAuthorityCategory ?? derivedExpected.category;
  const authorityCategorySource = derivedExpected.source;
  const officialHours = input.officialHoursEvaluation ?? derivedExpected.officialHours;

  const flowText = normalize(input.flowText ?? "");
  const sundayClosed = input.officialBusinessContext.businessHours.sunday.length === 0;
  const flowClaimsSundayOpen =
    flowText.includes("domingo") && /07:30|08:00|abert|atend/.test(flowText);
  if (sundayClosed && flowClaimsSundayOpen) {
    authorityConflictDetected = true;
    authorityConflictCategories.push("businessHours");
    winningSourceTypes.push("OFFICIAL_CONTEXT");
    rejectedSourceTypes.push("FLOW");
  }

  const priceClaim =
    !isHistoricalCustomerAmountReference(normalizedAnswer) &&
    (/\br\$\s*\d|\b\d+(?:[.,]\d{2})?\s*(?:reais|real)\b/.test(normalizedAnswer) ||
      (/(?:preco|valor|custa|custaria)/.test(normalizedAnswer) &&
        /\b\d{2,}\b/.test(normalizedAnswer)));
  const pickupExplicitlyUnconfirmed =
    /(?:nao posso|preciso confirmar|nao tenho como|nao consigo confirmar|sem confirmacao)/.test(
      normalizedAnswer,
    ) && /(?:busca|buscar|retirada|retirar|coleta|entrega)/.test(normalizedAnswer);
  const pickupClaim =
    !pickupExplicitlyUnconfirmed &&
    /(?:busca|buscar|retirada|retirar|domicilio|domiciliar)/.test(normalizedAnswer) &&
    /(?:realiz|dispon|fazemos|nao fazemos|nao realiz|buscamos)/.test(normalizedAnswer);
  const availabilityExplicitlyUnconfirmed =
    /(?:nao posso|preciso confirmar|nao tenho como|nao consigo confirmar|sem confirmacao)/.test(
      normalizedAnswer,
    ) && /(?:vaga|disponibilidade|horario|agendamento)/.test(normalizedAnswer);
  const availabilityClaim =
    !availabilityExplicitlyUnconfirmed &&
    !pickupExplicitlyUnconfirmed &&
    !/(?:telefone|whatsapp|contato|numero)/.test(normalizedAnswer) &&
    /(?:disponivel|temos horario|posso te atender|atendimento hoje|atendimento amanha|agendar|confirmar o agendamento|vaga)/.test(
      normalizedAnswer,
    );
  const exceptionClaim =
    /(?:esperar|aguardar|excecao|apos o horario|depois de fechar|consigo te atender)/.test(
      normalizedAnswer,
    ) && /(?:posso|consigo|sim|nao|não|atender|esperar)/.test(normalizedAnswer);
  const sundayOpenClaim =
    sundayClosed &&
    normalizedAnswer.includes("domingo") &&
    /(?:abert|atend|07:30|08:00|12:00)/.test(normalizedAnswer);
  const contactClaim =
    /(?:telefone|whatsapp|contato|numero)/.test(normalizedAnswer) &&
    /(?:oficial|empresa|assistencia|atendimento|informar|disponivel)/.test(normalizedAnswer);

  const generatedClaimCategory = priceClaim
    ? "price"
    : sundayOpenClaim
      ? "business_hours"
      : pickupClaim
        ? "pickup"
        : contactClaim
          ? "official_contact"
          : availabilityClaim
            ? normalizedQuestion.includes("agendar")
              ? "booking"
              : "availability"
            : exceptionClaim
              ? "exceptionRequest"
              : null;

  if (expectedCategory === "technical_evaluation") {
    if (generatedClaimCategory) {
      blockedCategories.push(generatedClaimCategory);
    }
    return {
      answer: safeUnavailable("technical_evaluation"),
      blockedCategories: Array.from(new Set(blockedCategories)),
      unsupportedClaimDetected: blockedCategories.length > 0,
      generatedClaimCategory,
      finalSafeResponseCategory: "technical_evaluation",
      authorityCategorySource: "triage_outcome",
      replacementReason: "explicit_triage_outcome_precedence",
      triageResponseProtected: true,
      authorityConflictDetected,
      authorityConflictCategories: Array.from(new Set(authorityConflictCategories)),
      winningSourceTypes: Array.from(new Set(winningSourceTypes)),
      rejectedSourceTypes: Array.from(new Set(rejectedSourceTypes)),
    };
  }

  if (
    expectedCategory === "business_hours" &&
    officialHours.evaluated &&
    (officialHours.requestedDayOpen === false || officialHours.requestedTimeWithinHours === false)
  ) {
    blockedCategories.push(
      generatedClaimCategory && generatedClaimCategory !== "business_hours"
        ? generatedClaimCategory
        : "businessHours",
    );
    return {
      answer: safeUnavailable("business_hours"),
      blockedCategories: Array.from(new Set(blockedCategories)),
      unsupportedClaimDetected: blockedCategories.length > 0,
      generatedClaimCategory,
      finalSafeResponseCategory: "business_hours",
      authorityCategorySource: "official_context",
      replacementReason: "official_business_hours_precedence",
      triageResponseProtected: false,
      authorityConflictDetected,
      authorityConflictCategories: Array.from(new Set(authorityConflictCategories)),
      winningSourceTypes: Array.from(new Set([...winningSourceTypes, "OFFICIAL_CONTEXT"])),
      rejectedSourceTypes: Array.from(new Set(rejectedSourceTypes)),
    };
  }

  const priceResponseAlreadySafe =
    /(?:nao tenho|nao possuo|preciso confirmar|posso verificar).{0,48}(?:preco|valor|orcamento)/.test(
      normalizedAnswer,
    );

  if (
    expectedCategory === "price" &&
    !hasSourceForCategory(input.sources, "price") &&
    !priceResponseAlreadySafe
  ) {
    if (generatedClaimCategory && generatedClaimCategory !== "price") {
      blockedCategories.push(generatedClaimCategory);
    } else {
      blockedCategories.push("price");
    }
    replacementCategory = "price";
    replacementReason = "expected_category_without_authority";
  } else if (priceClaim && !hasSourceForCategory(input.sources, "price")) {
    blockedCategories.push("price");
    replacementCategory = expectedCategory ?? "price";
  } else if (sundayOpenClaim) {
    blockedCategories.push("businessHours");
    replacementCategory = expectedCategory ?? "business_hours";
  } else if (pickupClaim && !hasSourceForCategory(input.sources, "pickup")) {
    blockedCategories.push("pickup");
    replacementCategory = expectedCategory ?? "pickup";
  } else if (
    expectedCategory === "official_contact" &&
    !input.officialContactAvailable &&
    !hasSourceForCategory(input.sources, "official_contact")
  ) {
    blockedCategories.push("official_contact");
    replacementCategory = "official_contact";
    replacementReason = "official_contact_unavailable";
  } else if (
    availabilityClaim &&
    !hasSourceForCategory(input.sources, "availability") &&
    !hasSourceForCategory(input.sources, "booking")
  ) {
    const claimCategory = normalizedQuestion.includes("agendar") ? "booking" : "availability";
    blockedCategories.push(claimCategory);
    replacementCategory = expectedCategory ?? claimCategory;
  } else if (exceptionClaim && !hasSourceForCategory(input.sources, "exceptionRequest")) {
    blockedCategories.push("exceptionRequest");
    replacementCategory = expectedCategory ?? "exceptionRequest";
  } else if (
    contactClaim &&
    !input.officialContactAvailable &&
    !hasSourceForCategory(input.sources, "official_contact")
  ) {
    blockedCategories.push("official_contact");
    replacementCategory = expectedCategory ?? "official_contact";
  }

  if (hasOfficialSchedule(input.officialBusinessContext)) {
    winningSourceTypes.push("OFFICIAL_CONTEXT");
  }
  if (input.officialContactAvailable && expectedCategory === "official_contact") {
    winningSourceTypes.push("OFFICIAL_CONTEXT");
  }
  if (replacementCategory) replacementReason = "unsupported_claim_replaced";

  return {
    answer: replacementCategory ? safeUnavailable(replacementCategory) : answer,
    blockedCategories: Array.from(new Set(blockedCategories)),
    unsupportedClaimDetected: blockedCategories.length > 0,
    generatedClaimCategory,
    finalSafeResponseCategory: replacementCategory,
    authorityCategorySource:
      expectedCategory !== null ? authorityCategorySource : generatedClaimCategory ? "claim" : "none",
    replacementReason,
    triageResponseProtected: false,
    authorityConflictDetected,
    authorityConflictCategories: Array.from(new Set(authorityConflictCategories)),
    winningSourceTypes: Array.from(new Set(winningSourceTypes)),
    rejectedSourceTypes: Array.from(new Set(rejectedSourceTypes)),
  };
}
