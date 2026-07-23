import type { AssistantFlow } from "@prisma/client";

export type CustomerStructuredFields = {
  knownFieldKeys: string[];
  pendingFieldKeys: string[];
  requestedDetailKey: string | null;
  secondaryIntentKeys: string[];
};

/**
 * A deliberately small, non-routing view of customer-authored requests in the
 * current turn. It lets a single selected flow keep operational ownership
 * while the response still acknowledges every explicit need in a buffered
 * turn.
 */
export type ExplicitCustomerRequestKey =
  | "technical_support"
  | "formatting"
  | "data_recovery"
  | "pickup_delivery"
  | "business_hours"
  | "pricing"
  | "warranty";

export type MultiIntentTurn = {
  primaryIntent: ExplicitCustomerRequestKey | null;
  secondaryIntents: ExplicitCustomerRequestKey[];
  explicitRequests: ExplicitCustomerRequestKey[];
  unresolvedRequests: ExplicitCustomerRequestKey[];
};

export type FlowKeywordEvidence = {
  flowId: string;
  flowName: string;
  intentKey: string;
  score: number;
  matchedAliases: string[];
  priority: number;
};

export type StructuralRoutingCategory =
  | "printer"
  | "notebook"
  | "apple_media"
  | "nobreak_electronics"
  | "external_visit"
  | "institutional_information"
  | "general_technical_support"
  | "none";

export type TriagePreemptionReason =
  | "PRICE_OR_QUOTE"
  | "WARRANTY_OR_PREVIOUS_SERVICE"
  | "BUSINESS_HOURS"
  | "HUMAN_HANDOFF"
  | "OFFICIAL_CONTACT"
  | "PICKUP_DELIVERY"
  | "EQUIPMENT_OR_TOPIC_CHANGE";

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
    .replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, "-")
    .replace(/\bwi[\s-]*fi\b/g, "wifi")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Identifies a self-contained, current-turn request that must take priority
 * over a stale technical-triage question. This is intentionally narrow: a
 * mere acknowledgement or a direct answer to the pending field remains in
 * triage, while an explicit new operational request may select its own flow.
 */
export function getTriagePreemptionReason(message: string): TriagePreemptionReason | null {
  const text = normalizeIntentText(message);
  if (!text) return null;

  if (
    /\b(?:quanto sai|quanto custa|quanto fica|qual(?: o)? valor|qual(?: o)? preco|preco|valor|orcamento|custos?|tabela de precos?)\b/.test(
      text,
    )
  ) {
    return "PRICE_OR_QUOTE";
  }
  if (
    /\b(?:garantia|servico anterior|servico ja realizado|voltou a dar problema|voltou o defeito|deu problema de novo|apos o conserto|depois do conserto|voces arrumaram)\b/.test(
      text,
    )
  ) {
    return "WARRANTY_OR_PREVIOUS_SERVICE";
  }
  if (
    /\b(?:horario|funcionamento|que horas|abrem|abre|fecham|fecha|atendem|atendimento|segunda|terca|quarta|quinta|sexta|sabado|domingo)\b/.test(
      text,
    )
  ) {
    return "BUSINESS_HOURS";
  }
  if (
    /\b(?:quero falar com|falar com|atendente|atendimento humano|humano|humana|transfer[ei]|pessoa)\b/.test(
      text,
    )
  ) {
    return "HUMAN_HANDOFF";
  }
  if (/\b(?:endereco|onde fica|localizacao|telefone|whatsapp|contato|site)\b/.test(text)) {
    return "OFFICIAL_CONTACT";
  }
  if (/\b(?:coleta|retirada|retirar|buscar|buscam|entrega|entregam)\b/.test(text)) {
    return "PICKUP_DELIVERY";
  }
  if (
    /\b(?:outro equipamento|outro computador|outro notebook|computador de mesa|desktop|outro assunto)\b/.test(
      text,
    )
  ) {
    return "EQUIPMENT_OR_TOPIC_CHANGE";
  }
  return null;
}

function containsAlias(text: string, alias: string): boolean {
  const normalizedAlias = normalizeIntentText(alias);
  if (!normalizedAlias) return false;
  return ` ${text} `.includes(` ${normalizedAlias} `);
}

function flowFamily(flowName: string): string {
  const name = normalizeIntentText(flowName);
  if (
    name.includes("visita") ||
    name.includes("deslocamento") ||
    name.includes("atendimento externo")
  ) {
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
  const normalizedName = normalizeIntentText(flow.name);
  const text = `${normalizedName} ${configuredFlowText(flow)}`;
  // Named flows own their configured domain. Their descriptions can mention
  // adjacent services (for example, a field visit may mention printers at the
  // customer site) without becoming the primary flow for that equipment.
  if (/(?:visita tecnica externa|atendimento externo)/.test(normalizedName)) {
    return "external_visit";
  }
  if (/(?:impressora|etiqueta)/.test(normalizedName)) return "printer_support";
  if (/(?:vendas|comercial|seminov)/.test(normalizedName)) return "commercial";
  if (/(?:assistencia tecnica geral|suporte tecnico geral)/.test(normalizedName)) {
    return "technical_support";
  }
  if (
    /(?:notebook|upgrade|macbook|imac|videogame|monitor|\btvs?\b|nobreak|projetor|eletronico)/.test(
      normalizedName,
    )
  ) {
    return "technical_support";
  }
  // A concrete service domain owns the turn. PRICE is intentionally evaluated
  // last because it is a secondary intent for questions such as a recovery or
  // pickup quote.
  if (/(?:garantia|pos servico|pos atendimento|servico anterior)/.test(text)) {
    return "warranty";
  }
  if (/(?:recupera(?:cao|r)? de dados|recuperar dados|recuperar arquivos|hd externo)/.test(text)) {
    return "data_recovery";
  }
  if (/(?:relogio de ponto|controle de ponto)/.test(text)) return "time_clock";
  if (/(?:impressora|impressoras)/.test(text)) return "printer_support";
  if (/(?:visita|deslocamento|ir ate o local|atendimento no local|tecnico na empresa)/.test(text)) {
    return "external_visit";
  }
  if (/(?:buscar|busca|coleta|retirada|retirar|entrega|domicilio)/.test(text)) {
    return "pickup_delivery";
  }
  if (/(?:acessorios|produto|comprar|vendas|comercial)/.test(text)) {
    return "commercial";
  }
  const hasFormattingEvidence =
    /(?:formatar|formatacao|instalar windows|instalacao de windows)/.test(text);
  const isGenericTechnicalFlow = /(?:assistencia tecnica geral|suporte tecnico geral)/.test(
    normalizedName,
  );
  if (hasFormattingEvidence && !isGenericTechnicalFlow) return "formatting";
  if (
    /(?:formatar|formatacao|upgrade|melhoria|componentes|assistencia|tecnica|suporte|memoria|manutencao|conserto|reparo)/.test(
      text,
    )
  ) {
    return "technical_support";
  }
  if (/(?:preco|valor|orcamento|quanto custa|quanto fica|custos?)/.test(text)) {
    return "pricing";
  }
  if (/(?:endereco|localizacao|horario|telefone|contato|empresa)/.test(text)) {
    return "company_information";
  }
  return "unknown";
}

type SpecificEquipmentFlowKind = "notebook" | "apple_media" | "power_electronics";

function specificEquipmentFlowKind(flow: AssistantFlow): SpecificEquipmentFlowKind | null {
  const name = normalizeIntentText(flow.name);
  if (/(?:notebook|upgrade)/.test(name)) return "notebook";
  if (/(?:macbook|imac|videogame|monitor|\btvs?\b)/.test(name)) return "apple_media";
  if (/(?:nobreak|projetor|eletronico)/.test(name)) return "power_electronics";
  return null;
}

function specificEquipmentAliases(kind: SpecificEquipmentFlowKind) {
  switch (kind) {
    case "notebook":
      return [
        "notebook",
        "laptop",
        "tela de notebook",
        "bateria",
        "teclado",
        "carcaça",
        "dobradiça",
        "carregador",
        "fonte de notebook",
        "upgrade de notebook",
        "ssd no notebook",
        "memória no notebook",
      ];
    case "apple_media":
      return [
        "macbook",
        "imac",
        "apple",
        "videogame",
        "console",
        "playstation",
        "xbox",
        "monitor",
        "televisão",
        "televisao",
        "tv",
      ];
    case "power_electronics":
      return ["nobreak", "projetor", "eletrônico", "eletronico"];
  }
}

function isGenericTechnicalFlow(flow: AssistantFlow): boolean {
  return /(?:assistencia tecnica geral|suporte tecnico geral)/.test(normalizeIntentText(flow.name));
}

function explicitAliasesForFamily(family: string): Array<{ alias: string; weight: number }> {
  switch (family) {
    case "pricing":
      return [
        { alias: "valor", weight: 3 },
        { alias: "preço", weight: 3 },
        { alias: "quanto custa", weight: 4 },
        { alias: "quanto sai", weight: 4 },
        { alias: "quanto fica", weight: 4 },
        { alias: "orçamento", weight: 3 },
        { alias: "preço", weight: 3 },
      ];
    case "technical_support":
      return [
        { alias: "computador", weight: 3 },
        { alias: "pc", weight: 3 },
        { alias: "máquina", weight: 3 },
        { alias: "maquina", weight: 3 },
        { alias: "formatar", weight: 3 },
        { alias: "formatação", weight: 3 },
        { alias: "upgrade", weight: 6 },
        { alias: "memória", weight: 5 },
        { alias: "manutenção", weight: 5 },
        { alias: "conserto", weight: 5 },
        { alias: "defeito", weight: 5 },
        { alias: "não liga", weight: 5 },
        { alias: "travando", weight: 5 },
        { alias: "lento", weight: 4 },
      ];
    case "formatting":
      return [
        { alias: "formatar", weight: 7 },
        { alias: "formatação", weight: 7 },
        { alias: "instalar windows", weight: 7 },
        { alias: "instalação do windows", weight: 7 },
      ];
    case "data_recovery":
      return [
        { alias: "recuperar dados", weight: 6 },
        { alias: "recuperação de dados", weight: 6 },
        { alias: "recuperar arquivos", weight: 6 },
        { alias: "hd externo", weight: 4 },
      ];
    case "warranty":
      return [
        { alias: "garantia", weight: 6 },
        { alias: "voltou a dar problema", weight: 6 },
        { alias: "serviço anterior", weight: 5 },
      ];
    case "time_clock":
      return [
        { alias: "relógio de ponto", weight: 6 },
        { alias: "relogio de ponto", weight: 6 },
        { alias: "controle de ponto", weight: 5 },
      ];
    case "printer_support":
      return [
        { alias: "impressora", weight: 6 },
        { alias: "impressoras", weight: 6 },
      ];
    case "external_visit":
      return [
        { alias: "visita", weight: 5 },
        { alias: "ir até o local", weight: 5 },
        { alias: "ir ate o local", weight: 5 },
        { alias: "ir até o cliente", weight: 5 },
        { alias: "ir ate o cliente", weight: 5 },
        { alias: "ir até minha empresa", weight: 5 },
        { alias: "ir ate minha empresa", weight: 5 },
        { alias: "ir na empresa", weight: 5 },
        { alias: "ir ao endereço", weight: 5 },
        { alias: "ir ao endereco", weight: 5 },
        { alias: "atendimento no endereço", weight: 5 },
        { alias: "atendimento no endereco", weight: 5 },
        { alias: "atendimento no local", weight: 5 },
        { alias: "técnico na empresa", weight: 5 },
        { alias: "tecnico na empresa", weight: 5 },
        { alias: "técnico no local", weight: 5 },
        { alias: "tecnico no local", weight: 5 },
        { alias: "atender na empresa", weight: 5 },
        { alias: "deslocamento", weight: 5 },
        { alias: "serviço no local", weight: 5 },
        { alias: "servico no local", weight: 5 },
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

export function hasExternalVisitEvidence(text: string): boolean {
  const directVisitAliases = [
    "visita",
    "ir até o local",
    "ir ate o local",
    "ir até o cliente",
    "ir ate o cliente",
    "ir até minha empresa",
    "ir ate minha empresa",
    "ir na empresa",
    "ir ao endereço",
    "ir ao endereco",
    "atendimento no endereço",
    "atendimento no endereco",
    "atendimento no local",
    "técnico na empresa",
    "tecnico na empresa",
    "técnico no local",
    "tecnico no local",
    "atender na empresa",
    "deslocamento",
    "serviço no local",
    "servico no local",
  ];
  if (directVisitAliases.some((alias) => containsAlias(text, alias))) {
    return true;
  }

  const hasActorOrAttendance = /\b(?:tecnico|alguem|equipe|voces|profissional|atendimento)\b/.test(
    text,
  );
  const hasTravelOrPresence = /\b(?:ir|vir|comparecer|deslocar|atender|mandar|enviar)\b/.test(text);
  const hasCustomerDestination =
    /\b(?:meu|minha)\s+(?:endereco|casa|empresa|loja|escritorio)\b/.test(text) ||
    /\b(?:ao|ate|no|na)\s+(?:(?:meu|minha)\s+)?(?:endereco|casa|empresa|loja|escritorio|local)\b/.test(
      text,
    ) ||
    /\b(?:aqui|ate mim)\b/.test(text);
  if (hasActorOrAttendance && hasTravelOrPresence && hasCustomerDestination) {
    return true;
  }

  const hasNetworkEvidence = [
    "wifi",
    "rede",
    "roteador",
    "cabeamento",
    "infraestrutura",
    "configurar internet",
    "configurar rede",
  ].some((alias) => containsAlias(text, alias));
  const hasOnSiteEvidence = [
    "na empresa",
    "minha empresa",
    "no local",
    "no endereço",
    "no endereco",
    "no escritório",
    "no escritorio",
  ].some((alias) => containsAlias(text, alias));

  return hasNetworkEvidence && hasOnSiteEvidence;
}

function hasSpecificEquipmentEvidence(text: string): boolean {
  return /\b(?:impressora(?:s)?|notebook(?:s)?|macbook|imac|videogame(?:s)?|monitor(?:es)?|\btvs?\b|nobreak(?:s)?|projetor(?:es)?)\b/.test(
    text,
  );
}

function hasGenericComputerEvidence(text: string): boolean {
  return /\b(?:computador|pc|maquina)\b/.test(text);
}

function hasInstitutionalInformationEvidence(text: string): boolean {
  const asksForCompanyDetails =
    /\b(?:qual|quais|onde|informe|me passa|me passe|poderia passar|quero saber)\b/.test(text) &&
    /\b(?:endereco|localizacao|telefone|whatsapp|contato|dados? da empresa)\b/.test(text);
  const asksForDirections = /\bcomo\b.*\bchegar\b.*\b(?:voces|empresa|loja)\b/.test(text);
  const asksForWhatsApp = /\bvoces tem whatsapp\b/.test(text);
  const asksWhereTheyAre = /\bonde voces ficam\b/.test(text);
  return asksForCompanyDetails || asksForDirections || asksForWhatsApp || asksWhereTheyAre;
}

export function resolveStructuralRoutingCategory(message: string): StructuralRoutingCategory {
  const text = normalizeIntentText(message);
  if (
    /\b(?:impressora(?:s)?|impressao|toner|cartucho|cupom|etiqueta|termica|fiscal)\b/.test(text)
  ) {
    return "printer";
  }
  if (
    /\b(?:notebook(?:s)?|laptop|tela de notebook|bateria|teclado|carcaca|dobradica|carregador)\b/.test(
      text,
    )
  ) {
    return "notebook";
  }
  if (
    /\b(?:macbook|imac|apple|videogame(?:s)?|console|playstation|xbox|monitor(?:es)?|televisao|\btvs?\b)\b/.test(
      text,
    )
  ) {
    return "apple_media";
  }
  if (/\b(?:nobreak(?:s)?|projetor(?:es)?|eletronico(?:s)?)\b/.test(text)) {
    return "nobreak_electronics";
  }
  if (hasExternalVisitEvidence(text)) return "external_visit";
  if (hasInstitutionalInformationEvidence(text)) return "institutional_information";
  if (
    hasGenericComputerEvidence(text) &&
    /\b(?:travando|lento|nao liga|defeito|manutencao|estranho)\b/.test(text)
  ) {
    return "general_technical_support";
  }
  return "none";
}

function isCanonicalStructuralFlow(
  flow: AssistantFlow,
  category: Exclude<StructuralRoutingCategory, "none">,
): boolean {
  const name = normalizeIntentText(flow.name);
  switch (category) {
    case "printer":
      return configuredFlowFamily(flow) === "printer_support";
    case "notebook":
      return specificEquipmentFlowKind(flow) === "notebook";
    case "apple_media":
      return specificEquipmentFlowKind(flow) === "apple_media";
    case "nobreak_electronics":
      return specificEquipmentFlowKind(flow) === "power_electronics";
    case "external_visit":
      return configuredFlowFamily(flow) === "external_visit";
    case "institutional_information":
      return name === "informacoes da empresa";
    case "general_technical_support":
      return isGenericTechnicalFlow(flow);
  }
}

export function isContactPreferenceRequest(text: string): boolean {
  return /(?:prefiro (?:receber )?retorno|prefiro (?:ser )?contatad[oa]|me (?:chame|contate|fale) por|como prefiro receber retorno|pode falar comigo pelo)/.test(
    text,
  );
}

function isOfficialContactRequest(text: string): boolean {
  return (
    !isContactPreferenceRequest(text) &&
    /(?:telefone|numero|whatsapp|contato|como falar com voces|como falar com a empresa)/.test(text)
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
  const structuralCategory = resolveStructuralRoutingCategory(message);
  const hasConfiguredSpecificEquipmentEvidence = flows.some((flow) => {
    const kind = specificEquipmentFlowKind(flow);
    return (
      flow.active &&
      kind !== null &&
      [...specificEquipmentAliases(kind), ...parsedTriggerKeywords(flow)].some((alias) =>
        containsAlias(text, alias),
      )
    );
  });
  const candidates = flows
    .filter((flow) => flow.active)
    .map((flow) => {
      const intentKey = configuredFlowFamily(flow);
      if (
        intentKey === "company_information" &&
        structuralCategory !== "institutional_information"
      ) {
        return {
          flowId: flow.id,
          flowName: flow.name,
          intentKey,
          score: 0,
          matchedAliases: [],
          priority: flow.priority,
        };
      }
      if (intentKey === "external_visit") {
        if (structuralCategory !== "external_visit" || hasGenericComputerEvidence(text)) {
          return {
            flowId: flow.id,
            flowName: flow.name,
            intentKey,
            score: 0,
            matchedAliases: [],
            priority: flow.priority,
          };
        }
      }
      const specificKind = specificEquipmentFlowKind(flow);
      if (
        intentKey === "technical_support" &&
        isGenericTechnicalFlow(flow) &&
        hasConfiguredSpecificEquipmentEvidence
      ) {
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
        ...(specificKind
          ? specificEquipmentAliases(specificKind).map((alias) => ({ alias, weight: 5 }))
          : explicitAliasesForFamily(intentKey)),
        ...parsedTriggerKeywords(flow).map((alias) => ({ alias, weight: 2 })),
      ];
      const matched = new Map<string, number>();
      for (const candidate of aliases) {
        const normalized = normalizeIntentText(candidate.alias);
        if (normalized && containsAlias(text, candidate.alias)) {
          matched.set(normalized, Math.max(matched.get(normalized) ?? 0, candidate.weight));
        }
      }
      if (intentKey === "external_visit" && matched.size === 0) {
        matched.set("external_visit_evidence", 3);
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
    });
  const canonicalFlow =
    structuralCategory === "none"
      ? null
      : flows.find((flow) => flow.active && isCanonicalStructuralFlow(flow, structuralCategory));
  if (canonicalFlow) {
    const candidate = candidates.find((item) => item.flowId === canonicalFlow.id);
    if (candidate) {
      return [
        {
          ...candidate,
          score: Math.max(candidate.score, 1),
          matchedAliases: Array.from(
            new Set([...candidate.matchedAliases, `structural_${structuralCategory}`]),
          ),
        },
      ];
    }
  }

  return candidates
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
    case "formatting":
      return "consultar formatação e orçamento";
    case "data_recovery":
      return "consultar recuperação de dados";
    case "warranty":
      return "orientar garantia e pós-serviço";
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

export function extractExplicitCustomerRequestKeys(message: string): ExplicitCustomerRequestKey[] {
  const text = normalizeIntentText(message);
  const requests: ExplicitCustomerRequestKey[] = [];
  const add = (request: ExplicitCustomerRequestKey, condition: boolean) => {
    if (condition && !requests.includes(request)) requests.push(request);
  };

  add(
    "technical_support",
    /\b(?:notebook|computador|pc|equipamento)\b/.test(text) &&
      /\b(?:nao liga|nao esta ligando|nao ta ligando|nao inicia|nao funciona|defeito|problema|travando|lento|lentidao)\b/.test(
        text,
      ),
  );
  add(
    "formatting",
    /\b(?:formatar|formatacao|instalar windows|instalacao (?:do )?windows)\b/.test(text),
  );
  add(
    "data_recovery",
    /\b(?:recuperar dados|recuperacao de dados|recuperar arquivos|recuperacao de arquivos)\b/.test(
      text,
    ),
  );
  add("pickup_delivery", /\b(?:coleta|retirada|retirar|buscar|busca|entrega)\b/.test(text));
  add(
    "business_hours",
    /\b(?:horario|funcionamento|que horas|abrem|abre|fecham|fecha|sabado|domingo)\b/.test(text),
  );
  add("pricing", /\b(?:preco|valor|orcamento|quanto custa|quanto sai|quanto fica)\b/.test(text));
  add("warranty", /\bgarantia\b/.test(text));

  return requests;
}

function toExplicitRequestKey(
  intentKey: string | null | undefined,
): ExplicitCustomerRequestKey | null {
  switch (intentKey) {
    case "technical_support":
    case "formatting":
    case "data_recovery":
    case "pickup_delivery":
    case "business_hours":
    case "pricing":
    case "warranty":
      return intentKey;
    default:
      return null;
  }
}

export function buildMultiIntentTurn(input: {
  message: string;
  selectedIntentKey?: string | null;
}): MultiIntentTurn {
  const explicitRequests = extractExplicitCustomerRequestKeys(input.message);
  const selectedIntent = toExplicitRequestKey(input.selectedIntentKey);
  const primaryIntent =
    selectedIntent && explicitRequests.includes(selectedIntent)
      ? selectedIntent
      : (explicitRequests[0] ?? null);
  const secondaryIntents = explicitRequests.filter((request) => request !== primaryIntent);

  return {
    primaryIntent,
    secondaryIntents,
    explicitRequests,
    // These categories need a safe acknowledgement or structured source before
    // the response can claim they have been fully answered.
    unresolvedRequests: explicitRequests.filter(
      (request) =>
        request === "pricing" ||
        request === "warranty" ||
        request === "technical_support" ||
        request === "formatting" ||
        request === "data_recovery",
    ),
  };
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
  const deviceBrand =
    /\b(?:a marca (?:e )?|e)\s+(?:(?:um|uma)\s+)?(?:acer|dell|positivo|lenovo|asus|hp|samsung|apple)\b/.test(
      text,
    );

  if (isContactPreferenceRequest(text)) known.add("contact_preference_channel");

  if (deviceModel) known.add("device_model");
  if (deviceBrand) known.add("device_brand");
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
    (alias) =>
      normalized === normalizeIntentText(alias) ||
      normalized.startsWith(`${normalizeIntentText(alias)} `),
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
