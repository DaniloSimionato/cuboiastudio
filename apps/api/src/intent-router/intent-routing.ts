import type { AssistantFlow } from "@prisma/client";

export type CustomerStructuredFields = {
  knownFieldKeys: string[];
  pendingFieldKeys: string[];
  requestedDetailKey: string | null;
  secondaryIntentKeys: string[];
};

export type FlowKeywordEvidence = {
  flowId: string;
  flowName: string;
  intentKey: string;
  score: number;
  matchedAliases: string[];
  priority: number;
};

const TRIAGE_UNABLE_TO_ANSWER_ALIASES = [
  "não sei",
  "não entendo",
  "não faço ideia",
  "não sei explicar",
  "não tenho essa informação",
  "vocês podem verificar",
  "voces podem verificar",
  "vocês verificam aí",
  "voces verificam ai",
  "prefiro levar para avaliar",
  "depois vocês olham",
  "depois voces olham",
  "depois vocês veem",
  "depois voces veem",
  "depois vocês verificam",
  "depois voces verificam",
  "não consigo conferir",
  "nao consigo conferir",
];

export function normalizeIntentText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function containsAlias(text: string, alias: string): boolean {
  const normalizedAlias = normalizeIntentText(alias);
  if (!normalizedAlias) return false;
  return ` ${text} `.includes(` ${normalizedAlias} `);
}

function flowFamily(flowName: string): string {
  const name = normalizeIntentText(flowName);
  if (name.includes("visita") || name.includes("deslocamento") || name.includes("atendimento externo")) {
    return "external_visit";
  }
  if (name.includes("assistencia") || name.includes("tecnica")) return "technical_support";
  if (name.includes("vendas") || name.includes("comercial") || name.includes("seminov"))
    return "commercial";
  if (name.includes("coleta") || name.includes("entrega") || name.includes("busca"))
    return "pickup_delivery";
  if (name.includes("orcamento") || name.includes("preco")) return "pricing";
  if (name.includes("informacoes") || name.includes("empresa")) return "company_information";
  return name.replace(/\s+/g, "_") || "unknown";
}

function configuredFlowText(flow: AssistantFlow): string {
  return normalizeIntentText(
    [flow.triggerDescription ?? "", ...parsedTriggerKeywords(flow)].filter(Boolean).join(" "),
  );
}

function configuredFlowFamily(flow: AssistantFlow): string {
  const text = configuredFlowText(flow);
  if (/(?:visita|deslocamento|ir ate o local|atendimento no local|tecnico na empresa)/.test(text)) {
    return "external_visit";
  }
  if (/(?:buscar|busca|coleta|retirada|retirar|entrega|domicilio)/.test(text)) {
    return "pickup_delivery";
  }
  if (/(?:preco|valor|orcamento|quanto custa|quanto fica|custos?)/.test(text)) {
    return "pricing";
  }
  if (/(?:endereco|localizacao|horario|telefone|contato|empresa)/.test(text)) {
    return "company_information";
  }
  if (/(?:acessorios|produto|comprar|vendas|comercial)/.test(text)) {
    return "commercial";
  }
  if (
    /(?:formatar|formatacao|upgrade|melhoria|componentes|assistencia|tecnica|suporte|memoria|manutencao|conserto|reparo)/.test(
      text,
    )
  ) {
    return "technical_support";
  }
  return "unknown";
}

function explicitAliasesForFamily(family: string): Array<{ alias: string; weight: number }> {
  switch (family) {
    case "pricing":
      return [
        { alias: "valor", weight: 3 },
        { alias: "preço", weight: 3 },
        { alias: "quanto custa", weight: 4 },
        { alias: "quanto fica", weight: 4 },
        { alias: "orçamento", weight: 3 },
        { alias: "preço", weight: 3 },
      ];
    case "technical_support":
      return [
        { alias: "formatar", weight: 3 },
        { alias: "formatação", weight: 3 },
        { alias: "upgrade", weight: 4 },
        { alias: "memória", weight: 3 },
        { alias: "manutenção", weight: 3 },
        { alias: "conserto", weight: 3 },
      ];
    case "external_visit":
      return [
        { alias: "visita", weight: 5 },
        { alias: "ir até o local", weight: 5 },
        { alias: "ir ate o local", weight: 5 },
        { alias: "atendimento no endereço", weight: 5 },
        { alias: "atendimento no endereco", weight: 5 },
        { alias: "técnico na empresa", weight: 5 },
        { alias: "tecnico na empresa", weight: 5 },
        { alias: "deslocamento", weight: 5 },
      ];
    case "pickup_delivery":
      return [
        { alias: "buscar", weight: 4 },
        { alias: "vir buscar", weight: 5 },
        { alias: "vocês buscam", weight: 5 },
        { alias: "retirar", weight: 4 },
        { alias: "retirada", weight: 4 },
        { alias: "coleta", weight: 4 },
        { alias: "entrega", weight: 3 },
      ];
    case "commercial":
      return [
        { alias: "comprar", weight: 2 },
        { alias: "vendas", weight: 2 },
        { alias: "acessórios", weight: 2 },
      ];
    case "company_information":
      return [
        { alias: "endereço", weight: 4 },
        { alias: "onde fica", weight: 4 },
        { alias: "localização", weight: 3 },
        { alias: "horário", weight: 3 },
        { alias: "telefone", weight: 3 },
        { alias: "contato", weight: 3 },
        { alias: "como chegar", weight: 4 },
      ];
    default:
      return [];
  }
}

function hasExternalVisitEvidence(text: string): boolean {
  return [
    "visita",
    "ir até o local",
    "ir ate o local",
    "atendimento no endereço",
    "atendimento no endereco",
    "técnico na empresa",
    "tecnico na empresa",
    "deslocamento",
  ].some((alias) => containsAlias(text, alias));
}

function isOfficialContactRequest(text: string): boolean {
  return /(?:telefone|numero|whatsapp|contato|como falar com voces|como falar com a empresa)/.test(
    text,
  );
}

function parsedTriggerKeywords(flow: AssistantFlow): string[] {
  if (!flow.triggerKeywords) return [];
  try {
    const parsed = JSON.parse(flow.triggerKeywords);
    return Array.isArray(parsed)
      ? parsed.filter(
          (keyword): keyword is string => typeof keyword === "string" && keyword.trim().length > 0,
        )
      : [];
  } catch {
    return [];
  }
}

function extractGenericDeviceModel(text: string): string | null {
  const match = text.match(
    /\b(?:meu|minha|o meu|a minha|um|uma|no|na|em|do|da|modelo(?:\s+(?:do|da))?|equipamento|notebook|computador|pc)\s+(?:(?:é|e|:)\s*)?(?:(?:um|uma)\s+)?([a-z][a-z0-9-]*(?:\s+[a-z][a-z0-9-]*){0,3}\s+[a-z]?\d+)\b/i,
  );
  return match?.[1]?.trim() ?? null;
}

export function scoreFlowCandidates(
  message: string,
  flows: AssistantFlow[],
): FlowKeywordEvidence[] {
  const text = normalizeIntentText(message);
  return flows
    .filter((flow) => flow.active)
    .map((flow) => {
      const intentKey = configuredFlowFamily(flow);
      if (intentKey === "external_visit" && !hasExternalVisitEvidence(text)) {
        return {
          flowId: flow.id,
          flowName: flow.name,
          intentKey,
          score: 0,
          matchedAliases: [],
          priority: flow.priority,
        };
      }
      const aliases = [
        ...explicitAliasesForFamily(intentKey),
        ...parsedTriggerKeywords(flow).map((alias) => ({ alias, weight: 2 })),
      ];
      const matched = new Map<string, number>();
      for (const candidate of aliases) {
        const normalized = normalizeIntentText(candidate.alias);
        if (normalized && containsAlias(text, candidate.alias)) {
          matched.set(normalized, Math.max(matched.get(normalized) ?? 0, candidate.weight));
        }
      }
      if (intentKey === "company_information" && isOfficialContactRequest(text)) {
        matched.set("official_contact", 6);
      }
      return {
        flowId: flow.id,
        flowName: flow.name,
        intentKey,
        score: [...matched.values()].reduce((sum, value) => sum + value, 0),
        matchedAliases: [...matched.keys()],
        priority: flow.priority,
      };
    })
    .filter((candidate) => candidate.score > 0)
    .sort(
      (a, b) => b.score - a.score || b.priority - a.priority || a.flowId.localeCompare(b.flowId),
    );
}

export function flowIntentKeyForFlow(flow: AssistantFlow): string {
  return configuredFlowFamily(flow);
}

export function flowObjectiveForFlow(flow: AssistantFlow): string {
  switch (flowIntentKeyForFlow(flow)) {
    case "pricing":
      return "consultar preço oficial";
    case "technical_support":
      return "triagem técnica e compatibilidade";
    case "pickup_delivery":
      return "verificar política de coleta ou entrega";
    case "commercial":
      return "identificar produto ou acessório comercial";
    case "company_information":
      return "informar dados oficiais da empresa";
    case "external_visit":
      return "validar necessidade de visita técnica externa";
    default:
      return "entender a necessidade principal do cliente";
  }
}

export function extractCustomerStructuredFields(message: string): CustomerStructuredFields {
  const text = normalizeIntentText(message);
  const known = new Set<string>();
  const pending = new Set<string>();
  const secondary = new Set<string>();

  const hasSsd = /\bssd\b/.test(text);
  const hasRam = /\b(ram|memoria ram|memoria)\b/.test(text);
  const hasAccessories = /\b(mouse|teclado|fone|headset|kit gamer|acessorios)\b/.test(text);
  const deviceModel = Boolean(extractGenericDeviceModel(text));

  if (deviceModel) known.add("device_model");
  if (hasSsd) {
    known.add("requested_service_ssd");
    const capacity = text.match(/\b(\d{2,4})\s*(gb|tb)\b/);
    if (capacity) known.add("ssd_capacity_gb");
    if (!/\b(sata|nvme)\b/.test(text)) pending.add("ssd_interface");
  }
  if (hasRam) {
    known.add("requested_service_memory_upgrade");
    if (
      /\b\d{1,3}\s*gb\s*(de\s*)?(ram|memoria)\b|\b(ram|memoria)\s*(de\s*)?\d{1,3}\s*gb\b/.test(text)
    ) {
      known.add("ram_capacity_gb");
    }
  }
  if (/\bmouse\b/.test(text)) known.add("requested_accessory_mouse");
  if (/\bteclado\b/.test(text)) known.add("requested_accessory_keyboard");
  if (/\b(fone|headset)\b/.test(text)) known.add("requested_accessory_headset");
  if (/\bkit gamer\b/.test(text)) known.add("requested_accessory_gaming_kit");

  if (hasAccessories && (hasSsd || hasRam || /\bupgrade\b/.test(text))) {
    secondary.add("accessories");
  }
  if ((hasSsd || hasRam || /\bupgrade\b/.test(text)) && !deviceModel) pending.add("device_model");

  const requestedDetailKey = [...pending][0] ?? null;
  return {
    knownFieldKeys: [...known],
    pendingFieldKeys: [...pending],
    requestedDetailKey,
    secondaryIntentKeys: [...secondary],
  };
}

export function detectCustomerUnableToAnswer(message: string): boolean {
  const normalized = normalizeIntentText(message);
  return TRIAGE_UNABLE_TO_ANSWER_ALIASES.some(
    (alias) => normalized === normalizeIntentText(alias) || normalized.startsWith(`${normalizeIntentText(alias)} `),
  );
}

export function getCustomerUnableToAnswerReason(message: string): string | null {
  if (!detectCustomerUnableToAnswer(message)) return null;
  const normalized = normalizeIntentText(message);
  if (
    normalized.includes("verificar") ||
    normalized.includes("verificam") ||
    normalized.includes("olham") ||
    normalized.includes("veem")
  ) {
    return "CUSTOMER_REQUESTS_TECHNICAL_EVALUATION";
  }
  if (normalized.includes("prefiro levar")) return "CUSTOMER_PREFERS_EVALUATION";
  return "CUSTOMER_UNABLE_TO_PROVIDE_DETAIL";
}

export function flowObjective(flowName: string): string {
  switch (flowFamily(flowName)) {
    case "pricing":
      return "consultar preço oficial";
    case "technical_support":
      return "triagem técnica e compatibilidade";
    case "pickup_delivery":
      return "verificar política de coleta ou entrega";
    case "commercial":
      return "identificar produto ou acessório comercial";
    case "company_information":
      return "informar dados oficiais da empresa";
    case "external_visit":
      return "validar necessidade de visita técnica externa";
    default:
      return "entender a necessidade principal do cliente";
  }
}

export function flowIntentKey(flowName: string): string {
  return flowFamily(flowName);
}
