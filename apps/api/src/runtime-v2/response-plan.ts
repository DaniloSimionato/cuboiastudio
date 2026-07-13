import { getAuthorityAvailability } from "./authority-policy";
import {
  type AuthorityPolicy,
  type ConversationState,
  type RetrievedContext,
  type ResponsePlan,
  type TurnUnderstanding,
} from "./runtime-v2.types";

export function buildResponsePlan(input: {
  understanding: TurnUnderstanding;
  state: ConversationState;
  retrievedContext: RetrievedContext;
  authorityPolicy?: AuthorityPolicy;
}): ResponsePlan {
  const { understanding, state } = input;
  const authority = getAuthorityAvailability({
    categories: understanding.requestedInformationCategories,
    retrievedContext: input.retrievedContext,
    policy: input.authorityPolicy,
  });
  const factsAvailable = Object.keys(state.confirmedFacts);
  const missingCommercialAuthority =
    authority.missing.length > 0 &&
    authority.missing.some((category) =>
      [
        "price",
        "discount",
        "warranty",
        "deadline",
        "pickup",
        "delivery",
        "payment",
        "businessHours",
        "address",
        "serviceAvailability",
        "commercialPolicy",
      ].includes(category),
    );

  if (missingCommercialAuthority) {
    return {
      currentObjective: state.objective?.key ?? null,
      turnIntent: understanding.turnIntent,
      selectedFlowId: state.selectedFlowId,
      flowStage: state.flowStage,
      factsAvailable,
      factsMissing: authority.missing,
      claimsAllowed: [],
      claimsForbidden: authority.missing,
      toolsAllowed: [],
      action: "SAFE_UNAVAILABLE",
      responseGoal: "Informar a ausência de informação oficial e oferecer confirmação posterior.",
      shouldHandoff: false,
      reasonCodes: [
        "MISSING_AUTHORITY",
        ...authority.missing.map((category) => `MISSING_${category.toUpperCase()}`),
      ],
    };
  }

  if (understanding.isShortConfirmation && understanding.answeredQuestionKey) {
    return {
      currentObjective: state.objective?.key ?? null,
      turnIntent: understanding.turnIntent,
      selectedFlowId: state.selectedFlowId,
      flowStage: state.flowStage,
      factsAvailable,
      factsMissing: state.pendingFields,
      claimsAllowed: [],
      claimsForbidden: [],
      toolsAllowed: [],
      action: state.pendingFields.length > 0 ? "ASK_NEXT_QUESTION" : "ANSWER",
      responseGoal: "Confirmar o referente e seguir do próximo campo pendente.",
      nextQuestion: state.lastValidNextStep ?? undefined,
      shouldHandoff: false,
      reasonCodes: ["REFERENCE_RESOLVED", "KEEP_OBJECTIVE"],
    };
  }

  return {
    currentObjective: state.objective?.key ?? null,
    turnIntent: understanding.turnIntent,
    selectedFlowId: state.selectedFlowId,
    flowStage: state.flowStage,
    factsAvailable,
    factsMissing: state.pendingFields,
    claimsAllowed: authority.available.map((category) => ({
      category,
      sourceIds: [...input.retrievedContext.officialFacts, ...input.retrievedContext.toolResults]
        .filter((item) => item.authoritativeFor.includes(category))
        .map((item) => item.id),
    })),
    claimsForbidden: [],
    toolsAllowed: [],
    action: understanding.isSideQuestion
      ? "ANSWER"
      : state.pendingFields.length > 0
        ? "ASK_NEXT_QUESTION"
        : "ANSWER",
    responseGoal: understanding.isSideQuestion
      ? "Responder somente à pergunta lateral e preservar o objetivo atual."
      : "Responder de forma curta e avançar o próximo passo do objetivo atual.",
    nextQuestion:
      state.pendingFields.length > 0 ? (state.lastValidNextStep ?? undefined) : undefined,
    shouldHandoff: false,
    reasonCodes: [
      understanding.isSideQuestion ? "SIDE_QUESTION_KEEP_OBJECTIVE" : "NORMAL_RESPONSE",
    ],
  };
}
