import type { AssistantRuntimeSource } from "../assistants/assistant-runtime";
import type { OfficialBusinessContext } from "../assistants/official-business-context";

export type RuntimeAuthorityGuardResult = {
  answer: string;
  blockedCategories: string[];
  unsupportedClaimDetected: boolean;
  generatedClaimCategory: string | null;
  finalSafeResponseCategory: string | null;
  authorityCategorySource: "explicit_intent" | "normalized_intent" | "selected_flow" | "claim" | "none";
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
  | "exceptionRequest"
  | null;

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
        ["address", "businesshours"].includes(normalizedCategory))
    );
  });
}

function safeUnavailable(category: string): string {
  switch (category) {
    case "price":
      return "Não tenho um valor confirmado para esse serviço. Posso verificar para você.";
    case "pickup":
      return "Preciso confirmar se a retirada está disponível para esse atendimento.";
    case "booking":
    case "availability":
      return "Preciso confirmar a disponibilidade antes de indicar ou confirmar um horário.";
    case "business_hours":
      return "Preciso confirmar o horário oficial de funcionamento antes de responder.";
    case "address":
      return "Preciso confirmar o endereço oficial antes de informar esse dado.";
    case "exceptionRequest":
      return "Preciso confirmar essa exceção com um atendente antes de prometer esse atendimento.";
    default:
      return "Preciso confirmar essa informação antes de responder com segurança.";
  }
}

export function deriveExpectedAuthorityCategory(input: {
  currentMessage: string;
  normalizedIntent?: string | null;
  selectedFlowKey?: string | null;
}): { category: ExpectedAuthorityCategory; source: RuntimeAuthorityGuardResult["authorityCategorySource"] } {
  const message = normalize(input.currentMessage);
  if (/(?:preco|valor|quanto custa|quanto fica|orcamento|custa)/.test(message)) {
    return { category: "price", source: "explicit_intent" };
  }
  if (
    /(?:agendar|agendamento|marcar|reserva|domingo|segunda|terca|quarta|quinta|sexta|sabado)\b/.test(message) &&
    /(?:\b(?:as|a)\s*\d{1,2}|agendar|agendamento|marcar|reserva|horario)/.test(message)
  ) {
    return { category: "booking", source: "explicit_intent" };
  }
  if (/(?:para agora|imediato|disponibilidade|tem vaga|tem horario)/.test(message)) {
    return { category: "availability", source: "explicit_intent" };
  }
  if (/(?:horario|funcionamento|abrem|aberto|fechado)/.test(message)) {
    return { category: "business_hours", source: "explicit_intent" };
  }
  if (/(?:busca|buscar|retirada|retirar|coleta|domicilio)/.test(message)) {
    return { category: "pickup", source: "explicit_intent" };
  }
  if (/(?:endereco|onde fica|localizacao|como chegar)/.test(message)) {
    return { category: "address", source: "explicit_intent" };
  }
  if (/(?:esperar|aguardar|depois de fechar|apos o horario)/.test(message)) {
    return { category: "exceptionRequest", source: "explicit_intent" };
  }

  const normalizedIntent = normalize(input.normalizedIntent ?? "");
  if (normalizedIntent.includes("price") || normalizedIntent.includes("orcamento")) {
    return { category: "price", source: "normalized_intent" };
  }
  if (normalizedIntent.includes("booking") || normalizedIntent.includes("schedule")) {
    return { category: "booking", source: "normalized_intent" };
  }
  if (normalizedIntent.includes("availability")) {
    return { category: "availability", source: "normalized_intent" };
  }

  const flow = normalize(input.selectedFlowKey ?? "");
  if (flow.includes("price") || flow.includes("orcamento")) {
    return { category: "price", source: "selected_flow" };
  }
  if (flow.includes("pickup") || flow.includes("coleta")) {
    return { category: "pickup", source: "selected_flow" };
  }
  if (flow.includes("company") || flow.includes("informacoes")) {
    return { category: "address", source: "selected_flow" };
  }
  return { category: null, source: "none" };
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
  currentCustomerIntentSource?: "CUSTOMER_TEXT" | "TRANSCRIPTION";
  currentTurnIsExplicitIntent?: boolean;
}): RuntimeAuthorityGuardResult {
  const answer = input.answer.trim();
  const normalizedAnswer = normalize(answer);
  const normalizedQuestion = normalize(input.currentMessage);
  const blockedCategories: string[] = [];
  const winningSourceTypes: string[] = [];
  const rejectedSourceTypes: string[] = [];
  let replacementCategory: string | null = null;
  let authorityConflictDetected = false;
  const authorityConflictCategories: string[] = [];
  const derivedExpected = deriveExpectedAuthorityCategory({
    currentMessage: input.currentMessage,
    normalizedIntent: input.normalizedIntent,
    selectedFlowKey: input.selectedFlowKey,
  });
  const expectedCategory = input.expectedAuthorityCategory ?? derivedExpected.category;
  const authorityCategorySource = input.expectedAuthorityCategory
    ? "explicit_intent"
    : derivedExpected.source;

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
  const pickupClaim =
    /(?:busca|buscar|retirada|retirar|domicilio|domiciliar)/.test(normalizedAnswer) &&
    /(?:realiz|dispon|fazemos|nao fazemos|nao realiz|buscamos)/.test(normalizedAnswer);
  const availabilityExplicitlyUnconfirmed =
    /(?:nao posso|preciso confirmar|nao tenho como|nao consigo confirmar|sem confirmacao)/.test(
      normalizedAnswer,
    ) && /(?:vaga|disponibilidade|horario|agendamento)/.test(normalizedAnswer);
  const availabilityClaim =
    !availabilityExplicitlyUnconfirmed &&
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

  const generatedClaimCategory = priceClaim
    ? "price"
    : sundayOpenClaim
      ? "business_hours"
      : pickupClaim
        ? "pickup"
        : availabilityClaim
          ? normalizedQuestion.includes("agendar")
            ? "booking"
            : "availability"
          : exceptionClaim
            ? "exceptionRequest"
            : null;

  if (priceClaim && !hasSourceForCategory(input.sources, "price")) {
    blockedCategories.push("price");
    replacementCategory = expectedCategory ?? "price";
  } else if (sundayOpenClaim) {
    blockedCategories.push("businessHours");
    replacementCategory = expectedCategory ?? "business_hours";
  } else if (pickupClaim && !hasSourceForCategory(input.sources, "pickup")) {
    blockedCategories.push("pickup");
    replacementCategory = expectedCategory ?? "pickup";
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
  }

  if (hasOfficialSchedule(input.officialBusinessContext)) {
    winningSourceTypes.push("OFFICIAL_CONTEXT");
  }

  return {
    answer: replacementCategory ? safeUnavailable(replacementCategory) : answer,
    blockedCategories: Array.from(new Set(blockedCategories)),
    unsupportedClaimDetected: blockedCategories.length > 0,
    generatedClaimCategory,
    finalSafeResponseCategory: replacementCategory,
    authorityCategorySource:
      expectedCategory !== null ? authorityCategorySource : generatedClaimCategory ? "claim" : "none",
    authorityConflictDetected,
    authorityConflictCategories: Array.from(new Set(authorityConflictCategories)),
    winningSourceTypes: Array.from(new Set(winningSourceTypes)),
    rejectedSourceTypes: Array.from(new Set(rejectedSourceTypes)),
  };
}
