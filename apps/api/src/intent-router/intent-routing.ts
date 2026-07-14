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
  score: number;
  matchedAliases: string[];
  priority: number;
};

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
  if (name.includes("assistencia") || name.includes("tecnica")) return "technical_support";
  if (name.includes("vendas") || name.includes("comercial") || name.includes("seminov"))
    return "commercial";
  if (name.includes("coleta") || name.includes("entrega") || name.includes("busca"))
    return "pickup_delivery";
  if (name.includes("orcamento") || name.includes("preco")) return "pricing";
  if (name.includes("informacoes") || name.includes("empresa")) return "company_information";
  return name.replace(/\s+/g, "_") || "unknown";
}

function explicitAliases(flowName: string): Array<{ alias: string; weight: number }> {
  const family = flowFamily(flowName);
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
        { alias: "ssd", weight: 4 },
        { alias: "memória ram", weight: 4 },
        { alias: "memória", weight: 3 },
        { alias: "manutenção", weight: 3 },
        { alias: "conserto", weight: 3 },
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
        { alias: "mouse", weight: 2 },
        { alias: "teclado", weight: 2 },
        { alias: "fone", weight: 2 },
        { alias: "kit gamer", weight: 2 },
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

export function scoreFlowCandidates(
  message: string,
  flows: AssistantFlow[],
): FlowKeywordEvidence[] {
  const text = normalizeIntentText(message);
  return flows
    .filter((flow) => flow.active)
    .map((flow) => {
      const aliases = [
        ...explicitAliases(flow.name),
        ...parsedTriggerKeywords(flow).map((alias) => ({ alias, weight: 2 })),
      ];
      const matched = new Map<string, number>();
      for (const candidate of aliases) {
        const normalized = normalizeIntentText(candidate.alias);
        if (normalized && containsAlias(text, candidate.alias)) {
          matched.set(normalized, Math.max(matched.get(normalized) ?? 0, candidate.weight));
        }
      }
      return {
        flowId: flow.id,
        flowName: flow.name,
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

export function extractCustomerStructuredFields(message: string): CustomerStructuredFields {
  const text = normalizeIntentText(message);
  const known = new Set<string>();
  const pending = new Set<string>();
  const secondary = new Set<string>();

  const hasSsd = /\bssd\b/.test(text);
  const hasRam = /\b(ram|memoria ram|memoria)\b/.test(text);
  const hasAccessories = /\b(mouse|teclado|fone|headset|kit gamer|acessorios)\b/.test(text);
  const deviceModel = /\b(acer nitro 5|mac m1)\b/.test(text);

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
    default:
      return "entender a necessidade principal do cliente";
  }
}

export function flowIntentKey(flowName: string): string {
  return flowFamily(flowName);
}
