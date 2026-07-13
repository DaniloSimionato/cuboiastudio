import {
  type ConversationState,
  type RetrievalPlan,
  type TurnUnderstanding,
} from "./runtime-v2.types";

export function buildRetrievalPlan(input: {
  understanding: TurnUnderstanding;
  state: ConversationState;
}): RetrievalPlan {
  const { understanding, state } = input;
  const categories = [...understanding.requestedInformationCategories];
  const explicitTopic = understanding.explicitlyRequestsPreviousTopic;
  const isGreeting = understanding.turnIntent === "greeting";
  const memoryTopics = explicitTopic
    ? [state.objective?.subject, ...state.activeTopics].filter((item): item is string =>
        Boolean(item),
      )
    : [];
  const toolCapabilitiesNeeded = [
    ...(categories.includes("availability") ? ["availability"] : []),
    ...(categories.includes("booking") ? ["booking"] : []),
    ...(categories.includes("exceptionRequest") ? ["human_confirmation"] : []),
  ];

  return {
    includeContactIdentity: isGreeting || understanding.isShortConfirmation,
    memoryTopics,
    knowledgeQueries: categories.length > 0 ? [understanding.turnIntent] : [],
    officialFactCategories: categories,
    toolCapabilitiesNeeded,
    reasons: [
      ...(isGreeting ? ["IDENTITY_ONLY_FOR_GREETING"] : []),
      ...(explicitTopic ? ["EXPLICIT_PREVIOUS_TOPIC_REFERENCE"] : []),
      ...(understanding.isSideQuestion ? ["SIDE_QUESTION_REQUIRES_CURRENT_FACTS"] : []),
      ...(categories.length === 0 && !explicitTopic ? ["NO_RETRIEVAL_NEEDED"] : []),
    ],
  };
}
