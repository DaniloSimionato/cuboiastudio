import { type AuthorityLevel, type SourceType } from "./evidence-contracts";

export const EVIDENCE_POLICY_VERSION = "authority-evidence-v1" as const;

export const EVIDENCE_CATEGORIES = [
  "COMPANY_IDENTITY",
  "ADDRESS",
  "OFFICIAL_CONTACT",
  "BUSINESS_HOURS",
  "BUSINESS_HOURS_EXCEPTION",
  "PRICE",
  "AVAILABILITY",
  "BOOKING",
  "PICKUP_DELIVERY",
  "DEADLINE",
  "WARRANTY",
  "COMMERCIAL_POLICY",
  "TECHNICAL_INFORMATION",
  "CONTACT_PREFERENCE",
  "CUSTOMER_IDENTITY",
] as const;

export type EvidenceCategory = (typeof EVIDENCE_CATEGORIES)[number];

export type CategoryEvidencePolicy = {
  category: EvidenceCategory;
  authoritativeSourceTypes: SourceType[];
  contextualSourceTypes: SourceType[];
  allowStaleAsAuthority: boolean;
  allowUnknownAsAuthority: boolean;
  requireCurrentForAuthority: boolean;
  requiresToolCoverage: boolean;
  allowHumanConfirmed: boolean;
  policyVersion: typeof EVIDENCE_POLICY_VERSION;
};

const official = ["OFFICIAL_STRUCTURED", "OFFICIAL_DOCUMENT"] satisfies SourceType[];

function policy(
  category: EvidenceCategory,
  authoritativeSourceTypes: SourceType[],
  options: Partial<
    Omit<CategoryEvidencePolicy, "category" | "authoritativeSourceTypes" | "policyVersion">
  > = {},
): CategoryEvidencePolicy {
  return {
    category,
    authoritativeSourceTypes,
    contextualSourceTypes: [
      "FLOW_GUIDANCE",
      "CONVERSATION_HISTORY",
      "MODEL_GENERATED",
      "EXTERNAL_METADATA",
      "CONTACT_MEMORY",
      "TEMPORARY_MEMORY",
    ],
    allowStaleAsAuthority: false,
    allowUnknownAsAuthority: false,
    requireCurrentForAuthority: true,
    requiresToolCoverage: false,
    allowHumanConfirmed: false,
    policyVersion: EVIDENCE_POLICY_VERSION,
    ...options,
  };
}

export const DEFAULT_EVIDENCE_POLICIES: Record<EvidenceCategory, CategoryEvidencePolicy> = {
  COMPANY_IDENTITY: policy("COMPANY_IDENTITY", official),
  ADDRESS: policy("ADDRESS", official),
  OFFICIAL_CONTACT: policy("OFFICIAL_CONTACT", official),
  BUSINESS_HOURS: policy("BUSINESS_HOURS", ["OFFICIAL_STRUCTURED", "TOOL_RESULT"], {
    requiresToolCoverage: false,
  }),
  BUSINESS_HOURS_EXCEPTION: policy(
    "BUSINESS_HOURS_EXCEPTION",
    ["OFFICIAL_STRUCTURED", "TOOL_RESULT", "HUMAN_CONFIRMED"],
    {
      allowHumanConfirmed: true,
    },
  ),
  PRICE: policy("PRICE", ["OFFICIAL_STRUCTURED", "OFFICIAL_DOCUMENT", "TOOL_RESULT"]),
  AVAILABILITY: policy("AVAILABILITY", ["TOOL_RESULT"], { requiresToolCoverage: true }),
  BOOKING: policy("BOOKING", ["TOOL_RESULT"], { requiresToolCoverage: true }),
  PICKUP_DELIVERY: policy("PICKUP_DELIVERY", [
    "OFFICIAL_STRUCTURED",
    "OFFICIAL_DOCUMENT",
    "TOOL_RESULT",
  ]),
  DEADLINE: policy("DEADLINE", ["OFFICIAL_STRUCTURED", "OFFICIAL_DOCUMENT", "TOOL_RESULT"]),
  WARRANTY: policy("WARRANTY", ["OFFICIAL_STRUCTURED", "OFFICIAL_DOCUMENT", "TOOL_RESULT"]),
  COMMERCIAL_POLICY: policy("COMMERCIAL_POLICY", [
    "OFFICIAL_STRUCTURED",
    "OFFICIAL_DOCUMENT",
    "TOOL_RESULT",
  ]),
  TECHNICAL_INFORMATION: policy(
    "TECHNICAL_INFORMATION",
    [
      "OFFICIAL_STRUCTURED",
      "OFFICIAL_DOCUMENT",
      "TOOL_RESULT",
      "CUSTOMER_PROVIDED",
      "SESSION_FACT",
    ],
    {
      allowHumanConfirmed: true,
      contextualSourceTypes: [
        "CONTACT_MEMORY",
        "TEMPORARY_MEMORY",
        "CONVERSATION_HISTORY",
        "FLOW_GUIDANCE",
        "MODEL_GENERATED",
        "EXTERNAL_METADATA",
      ],
    },
  ),
  CONTACT_PREFERENCE: policy(
    "CONTACT_PREFERENCE",
    ["CUSTOMER_PROVIDED", "CONTACT_MEMORY", "SESSION_FACT", "HUMAN_CONFIRMED"],
    {
      allowHumanConfirmed: true,
      contextualSourceTypes: [
        "CONVERSATION_HISTORY",
        "FLOW_GUIDANCE",
        "MODEL_GENERATED",
        "EXTERNAL_METADATA",
      ],
    },
  ),
  CUSTOMER_IDENTITY: policy("CUSTOMER_IDENTITY", ["CUSTOMER_PROVIDED", "HUMAN_CONFIRMED"], {
    allowHumanConfirmed: true,
    contextualSourceTypes: [
      "CONTACT_MEMORY",
      "CONVERSATION_HISTORY",
      "FLOW_GUIDANCE",
      "MODEL_GENERATED",
      "EXTERNAL_METADATA",
    ],
  }),
};
