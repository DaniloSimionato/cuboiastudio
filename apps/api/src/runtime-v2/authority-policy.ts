import {
  type AuthorityPolicy,
  type RetrievedContext,
  type RetrievedItem,
} from "./runtime-v2.types";

export const DEFAULT_AUTHORITY_POLICY: AuthorityPolicy = {
  price: { category: "price", authorizedSourceTypes: ["OFFICIAL_CONTEXT", "TOOL"], required: true },
  discount: {
    category: "discount",
    authorizedSourceTypes: ["OFFICIAL_CONTEXT", "TOOL"],
    required: true,
  },
  warranty: {
    category: "warranty",
    authorizedSourceTypes: ["OFFICIAL_CONTEXT", "KNOWLEDGE", "TOOL"],
    required: true,
  },
  deadline: {
    category: "deadline",
    authorizedSourceTypes: ["OFFICIAL_CONTEXT", "TOOL"],
    required: true,
  },
  pickup: {
    category: "pickup",
    authorizedSourceTypes: ["OFFICIAL_CONTEXT", "KNOWLEDGE", "TOOL"],
    required: true,
  },
  delivery: {
    category: "delivery",
    authorizedSourceTypes: ["OFFICIAL_CONTEXT", "KNOWLEDGE", "TOOL"],
    required: true,
  },
  payment: {
    category: "payment",
    authorizedSourceTypes: ["OFFICIAL_CONTEXT", "TOOL"],
    required: true,
  },
  businessHours: {
    category: "businessHours",
    authorizedSourceTypes: ["OFFICIAL_CONTEXT", "TOOL"],
    required: true,
  },
  address: {
    category: "address",
    authorizedSourceTypes: ["OFFICIAL_CONTEXT", "TOOL"],
    required: true,
  },
  serviceAvailability: {
    category: "serviceAvailability",
    authorizedSourceTypes: ["OFFICIAL_CONTEXT", "KNOWLEDGE", "TOOL"],
    required: true,
  },
  availability: {
    category: "availability",
    authorizedSourceTypes: ["OFFICIAL_CONTEXT", "TOOL"],
    required: true,
  },
  booking: {
    category: "booking",
    authorizedSourceTypes: ["TOOL"],
    required: true,
  },
  exceptionRequest: {
    category: "exceptionRequest",
    authorizedSourceTypes: ["OFFICIAL_CONTEXT", "TOOL"],
    required: true,
  },
  commercialPolicy: {
    category: "commercialPolicy",
    authorizedSourceTypes: ["OFFICIAL_CONTEXT", "KNOWLEDGE", "TOOL"],
    required: true,
  },
  technicalInformation: {
    category: "technicalInformation",
    authorizedSourceTypes: ["OFFICIAL_CONTEXT", "KNOWLEDGE", "TOOL"],
    required: true,
  },
};

export function selectAuthoritativeItems(
  items: RetrievedItem[],
  category: string,
  policy: AuthorityPolicy = DEFAULT_AUTHORITY_POLICY,
): RetrievedItem[] {
  const rule = policy[category];
  if (!rule) return [];
  return items.filter(
    (item) =>
      item.authoritativeFor.includes(category) &&
      rule.authorizedSourceTypes.includes(item.sourceType),
  );
}

export function getAuthorityAvailability(input: {
  categories: string[];
  retrievedContext: RetrievedContext;
  policy?: AuthorityPolicy;
}): { available: string[]; missing: string[] } {
  const allItems = [
    ...input.retrievedContext.officialFacts,
    ...input.retrievedContext.knowledgeChunks,
    ...input.retrievedContext.toolResults,
  ];
  const available = input.categories.filter(
    (category) => selectAuthoritativeItems(allItems, category, input.policy).length > 0,
  );
  return {
    available,
    missing: input.categories.filter((category) => !available.includes(category)),
  };
}
