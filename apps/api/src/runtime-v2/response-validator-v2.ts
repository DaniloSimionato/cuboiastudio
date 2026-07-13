import {
  type ConversationState,
  type ResponsePlan,
  type ResponseValidationResult,
} from "./runtime-v2.types";

const COMMERCIAL_PATTERNS: Array<{ category: string; pattern: RegExp }> = [
  { category: "price", pattern: /(?:r\$\s*\d|\b\d+[,.]?\d*\s*(?:reais|real)\b|custa\s+\d)/i },
  { category: "deadline", pattern: /\b(?:prazo|entrega em|fica pronto em)\b/i },
  { category: "warranty", pattern: /\bgarantia\b/i },
  { category: "pickup", pattern: /\b(?:busca|buscar|retirada)\b/i },
  { category: "delivery", pattern: /\b(?:entrega|entregamos)\b/i },
];

function isAffirmativeCommercialClaim(answer: string, pattern: RegExp): boolean {
  const match = answer.match(pattern);
  if (!match || match.index === undefined) return false;
  const prefix = answer.slice(Math.max(0, match.index - 60), match.index);
  return !/(?:não|nao)\s+(?:tenho|possuo|há|ha|existe|consigo)|\bsem\s+(?:confirmação|confirmacao|fonte|informação|informacao)/i.test(
    prefix,
  );
}

export function validateResponse(input: {
  answer: string;
  responsePlan: ResponsePlan;
  conversationState: ConversationState;
  generatedQuestionKey?: string | null;
  toolCalls?: string[];
}): ResponseValidationResult {
  const unsupportedClaimCategories = COMMERCIAL_PATTERNS.filter(
    ({ category, pattern }) =>
      isAffirmativeCommercialClaim(input.answer, pattern) &&
      !input.responsePlan.claimsAllowed.some((claim) => claim.category === category),
  ).map(({ category }) => category);
  const repeatedQuestionDetected = Boolean(
    input.generatedQuestionKey &&
    input.conversationState.answeredQuestions.includes(input.generatedQuestionKey),
  );
  const unauthorizedTools = (input.toolCalls ?? []).filter(
    (tool) => !input.responsePlan.toolsAllowed.includes(tool),
  );
  const reasonCodes = [
    ...(unsupportedClaimCategories.length > 0 ? ["UNSUPPORTED_COMMERCIAL_CLAIM"] : []),
    ...(repeatedQuestionDetected ? ["REPEATED_QUESTION"] : []),
    ...(unauthorizedTools.length > 0 ? ["UNAUTHORIZED_TOOL"] : []),
  ];

  if (
    unsupportedClaimCategories.length === 0 &&
    !repeatedQuestionDetected &&
    unauthorizedTools.length === 0
  ) {
    return {
      result: "PASS",
      reasonCodes: [],
      unsupportedClaimDetected: false,
      unsupportedClaimCategories: [],
      repeatedQuestionDetected: false,
    };
  }

  return {
    result: "SAFE_REPLACEMENT",
    reasonCodes,
    unsupportedClaimDetected: unsupportedClaimCategories.length > 0,
    unsupportedClaimCategories,
    repeatedQuestionDetected,
    replacementCategory:
      unsupportedClaimCategories[0] ??
      (repeatedQuestionDetected ? "repeated_question" : "unauthorized_tool"),
  };
}

export function safeReplacementFor(category: string): string {
  if (category === "repeated_question")
    return "Esse dado já foi confirmado. Vou seguir para o próximo passo do atendimento.";
  if (category === "unauthorized_tool")
    return "Não consigo executar essa ação neste momento sem uma autorização válida.";
  return "Não tenho uma informação confirmada para esse ponto. Posso verificar isso para você.";
}
