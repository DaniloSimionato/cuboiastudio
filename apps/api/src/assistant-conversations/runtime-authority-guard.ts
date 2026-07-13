import type { AssistantRuntimeSource } from "../assistants/assistant-runtime";
import type { OfficialBusinessContext } from "../assistants/official-business-context";

export type RuntimeAuthorityGuardResult = {
  answer: string;
  blockedCategories: string[];
  unsupportedClaimDetected: boolean;
  authorityConflictDetected: boolean;
  authorityConflictCategories: string[];
  winningSourceTypes: string[];
  rejectedSourceTypes: string[];
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
    case "exceptionRequest":
      return "Preciso confirmar essa exceção com um atendente antes de prometer esse atendimento.";
    default:
      return "Preciso confirmar essa informação antes de responder com segurança.";
  }
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

  if (priceClaim && !hasSourceForCategory(input.sources, "price")) {
    blockedCategories.push("price");
    replacementCategory = "price";
  } else if (sundayOpenClaim) {
    blockedCategories.push("businessHours");
    replacementCategory = "businessHours";
  } else if (pickupClaim && !hasSourceForCategory(input.sources, "pickup")) {
    blockedCategories.push("pickup");
    replacementCategory = "pickup";
  } else if (
    availabilityClaim &&
    !hasSourceForCategory(input.sources, "availability") &&
    !hasSourceForCategory(input.sources, "booking")
  ) {
    blockedCategories.push(normalizedQuestion.includes("agendar") ? "booking" : "availability");
    replacementCategory = blockedCategories[0];
  } else if (exceptionClaim && !hasSourceForCategory(input.sources, "exceptionRequest")) {
    blockedCategories.push("exceptionRequest");
    replacementCategory = "exceptionRequest";
  }

  if (hasOfficialSchedule(input.officialBusinessContext)) {
    winningSourceTypes.push("OFFICIAL_CONTEXT");
  }

  return {
    answer: replacementCategory ? safeUnavailable(replacementCategory) : answer,
    blockedCategories: Array.from(new Set(blockedCategories)),
    unsupportedClaimDetected: blockedCategories.length > 0,
    authorityConflictDetected,
    authorityConflictCategories: Array.from(new Set(authorityConflictCategories)),
    winningSourceTypes: Array.from(new Set(winningSourceTypes)),
    rejectedSourceTypes: Array.from(new Set(rejectedSourceTypes)),
  };
}
