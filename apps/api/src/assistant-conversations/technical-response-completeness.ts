import { normalizeIntentText } from "../intent-router/intent-routing";

export const SLOW_COMPUTER_QUALIFICATION_RESPONSE =
  "Entendi. Ele fica lento desde que liga ou principalmente quando você abre algum programa? Com essa informação conseguimos direcionar melhor e, se necessário, fazer uma avaliação para identificar a causa.";

export type TechnicalResponseCompletenessReason =
  | "NOT_APPLICABLE"
  | "ALREADY_COMPLETE"
  | "MISSING_PROBLEM_ACKNOWLEDGEMENT"
  | "MISSING_QUALIFYING_QUESTION"
  | "MISSING_NEXT_STEP"
  | "UNSUPPORTED_DIAGNOSIS"
  | "UNSUPPORTED_PRICE"
  | "NON_CANONICAL_TECHNICAL_RESPONSE";

export type TechnicalResponseCompletenessResult = Readonly<{
  answer: string;
  applied: boolean;
  reason: TechnicalResponseCompletenessReason;
}>;

function isSlowComputerTurn(message: string, technicalSupportIntent: boolean): boolean {
  if (!technicalSupportIntent) return false;
  const text = normalizeIntentText(message);
  const explicitlyNegated =
    /\b(?:nao|nunca)\s+(?:(?:(?:esta|ta|fica|ficou|e)\s+)?(?:muito\s+)?lento|(?:(?:tem|apresenta|esta|ta)\s+)?(?:com\s+)?lentidao)\b/.test(
      text,
    ) || /\bsem\s+lentidao\b/.test(text);
  return (
    !explicitlyNegated &&
    /\b(?:computador|pc|notebook|equipamento)\b/.test(text) &&
    /\b(?:lento|lentidao)\b/.test(text)
  );
}

function replacement(reason: TechnicalResponseCompletenessReason): TechnicalResponseCompletenessResult {
  return {
    answer: SLOW_COMPUTER_QUALIFICATION_RESPONSE,
    applied: true,
    reason,
  };
}

export function ensureTechnicalResponseCompleteness(input: {
  answer: string;
  currentMessage: string;
  technicalSupportIntent: boolean;
  providerStandardPath: boolean;
}): TechnicalResponseCompletenessResult {
  const answer = input.answer.trim();
  if (
    !input.providerStandardPath ||
    !isSlowComputerTurn(input.currentMessage, input.technicalSupportIntent)
  ) {
    return { answer, applied: false, reason: "NOT_APPLICABLE" };
  }

  const normalized = normalizeIntentText(answer);
  if (normalized === normalizeIntentText(SLOW_COMPUTER_QUALIFICATION_RESPONSE)) {
    return { answer, applied: false, reason: "ALREADY_COMPLETE" };
  }
  const acknowledgesProblem =
    /\b(?:entendi|entendemos|lentidao|lento|desempenho|problema)\b/.test(normalized);
  const qualifyingQuestionPattern =
    /\b(?:desde quando|desde que|quando (?:liga|inicia|abre|usa|executa|acontece)|liga|inicia|abre|programa|aplicativo|tarefa|ao usar|durante o uso|principalmente|sempre|so quando)\b/;
  const hasQualifyingQuestion = (answer.match(/[^.!?]*\?/g) ?? []).some((question) =>
    qualifyingQuestionPattern.test(normalizeIntentText(question)),
  );
  const hasNextStep =
    /\b(?:avaliacao|avaliar|verificar|identificar|direcionar|trazer|levar|agendar|encaminhar|testar)\b/.test(
      normalized,
    );
  const claimsUnsupportedPrice =
    /r\s*\$|\$\s*\d/i.test(answer) ||
    /\b(?:preco|valor|custa|custaria|orcamento)\b/.test(normalized);
  const claimsUnsupportedDiagnosis =
    /\b(?:a causa e|isso acontece porque|isso e causado por|seu computador esta lento porque|com certeza|certamente|sem duvida|deve ser|provavelmente|talvez|e falta de|e problema de|pode ser|pode estar com|pode ter|poderia ser|poderia estar com)\b/.test(
      normalized,
    );

  if (claimsUnsupportedPrice) return replacement("UNSUPPORTED_PRICE");
  if (claimsUnsupportedDiagnosis) return replacement("UNSUPPORTED_DIAGNOSIS");
  if (!acknowledgesProblem) return replacement("MISSING_PROBLEM_ACKNOWLEDGEMENT");
  if (!hasQualifyingQuestion) return replacement("MISSING_QUALIFYING_QUESTION");
  if (!hasNextStep) return replacement("MISSING_NEXT_STEP");
  return replacement("NON_CANONICAL_TECHNICAL_RESPONSE");
}
