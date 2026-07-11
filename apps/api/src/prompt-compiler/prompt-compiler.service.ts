import { Injectable } from "@nestjs/common";
import type { AiChatCompletionMessage } from "../ai/ai.types";
import { Assistant, AssistantBehavior, AssistantFlow } from "@prisma/client";
import type { OfficialBusinessContext } from "../assistants/official-business-context";

const MAX_HISTORY_MESSAGE_LENGTH = 1000;
const MAX_PROMPT_TEXT_LENGTH = 10000;

export const PROMPT_COMPILER_VERSION = "conversation-policy-v3";

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength) + "... [texto truncado]";
}

function firstNonEmpty(...values: Array<string | null | undefined>): string | null {
  return values.find((value) => typeof value === "string" && value.trim().length > 0)?.trim() ?? null;
}

export function isMultiNeedTriageMessage(message: string): boolean {
  if (!message) return false;

  const text = message.toLowerCase().trim();

  const greetings = [
    /\b(oi|ol[aá]|opa|salve|eae|co[eé])\b/g,
    /\b(bom\s+dia|boa\s+tarde|boa\s+noite)\b/g,
    /\b(tudo\s+bem|tudo\s+bom|como\s+vai|tudo\s+certinho|tudo\s+certo)\b/g,
    /\b(por\s+favor|por\s+gentileza)\b/g,
    /\b(gostaria\s+de\s+saber|gostaria\s+de\s+tirar\s+uma\s+d[uú]vida|gostaria\s+de\s+uma\s+informa[cç][aã]o)\b/g,
    /\b(voc[eê]\s+pode\s+me\s+ajudar|pode\s+me\s+ajudar|como\s+podemos\s+fazer|o\s+que\s+podemos\s+fazer)\b/g
  ];

  const cleanAndCheckSubstance = (clause: string): string => {
    let temp = clause.trim();
    for (const pattern of greetings) {
      temp = temp.replace(pattern, "");
    }
    return temp.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "").replace(/\s+/g, " ").trim();
  };

  const lines = text.split(/\n+/).map(l => l.trim()).filter(l => l.length > 0);
  const explicitListItems = lines.filter(line => /^[-*•]|^\d+[.)]/.test(line));
  if (explicitListItems.length >= 2) {
    return true;
  }

  let totalSubstantiveParts = 0;
  const substantiveLines: string[] = [];

  for (const line of lines) {
    const parts = line.split(/[,;\n]|\b(?:e|ou)\b/i)
      .map(p => p ? p.trim() : "")
      .filter(p => p.length > 0);

    let lineSubstantiveParts = 0;
    for (const part of parts) {
      const cleanPart = cleanAndCheckSubstance(part);
      if (cleanPart.length > 2 && !["com", "para", "uma", "uns", "dos", "das"].includes(cleanPart)) {
        lineSubstantiveParts++;
      }
    }

    if (lineSubstantiveParts > 0) {
      substantiveLines.push(line);
      totalSubstantiveParts += lineSubstantiveParts;
    }
  }

  if (substantiveLines.length >= 2) {
    return true;
  }

  if (totalSubstantiveParts >= 2) {
    return true;
  }

  return false;
}

export type PromptCompilerInput = {
  assistant: Partial<Assistant>;
  behavior?: AssistantBehavior | null;
  flow?: AssistantFlow | null;
  securityRules?: Array<{
    name: string;
    ruleType: string;
    instruction: string;
  }>;
  knowledgeItems: { id?: string; title: string; content: string }[];
  historyMessages: any[];
  currentMessage: string;
  officialBusinessContext?: OfficialBusinessContext | null;
  calendarContext?: {
    contactPhone?: string | null;
    conversationId: string;
    serverTime?: string | null;
    resourcesContext?: string | null;
  } | null;
  memoryContextBlock?: string | null;
};

function buildSecurityBlock(
  assistant: Partial<Assistant>,
  securityRules: PromptCompilerInput["securityRules"],
): string | null {
  const safetyInstruction = assistant.safetyInstruction?.trim();
  const activeSecurityRules = (securityRules ?? []).filter((rule) => rule.instruction.trim());

  if (!safetyInstruction && activeSecurityRules.length === 0) {
    return null;
  }

  return [
    "REGRAS DE SEGURANÇA DO ASSISTENTE E LIMITES OBRIGATÓRIOS:",
    safetyInstruction ? `- Regra legada: ${safetyInstruction}` : null,
    ...activeSecurityRules.map(
      (rule, index) => `- ${index + 1}. ${rule.name} (${rule.ruleType}): ${rule.instruction.trim()}`,
    ),
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}

function buildBehaviorBlock(
  assistant: Partial<Assistant>,
  behavior: AssistantBehavior | null | undefined,
): string {
  const personality = firstNonEmpty(behavior?.personality, assistant.personality);
  const toneOfVoice = firstNonEmpty(behavior?.toneOfVoice, assistant.toneOfVoice);
  const emojiUsage = firstNonEmpty(behavior?.emojiUsage, "low") ?? "low";
  const responseStyle = firstNonEmpty(behavior?.responseStyle, "whatsapp") ?? "whatsapp";
  const splitResponseStyle = firstNonEmpty(assistant.splitResponseStyle, "SINGLE") ?? "SINGLE";
  const unknownBehavior = firstNonEmpty(behavior?.unknownBehavior, "fallback") ?? "fallback";
  const fallbackMessage = firstNonEmpty(assistant.fallbackMessage);
  const lines = [
    "POLÍTICA DE CONVERSA (COMPORTAMENTO CONFIGURADO):",
    "Esta é a fonte principal para o formato e o ritmo da resposta. Regras de segurança sempre têm prioridade; instruções de escopo, fluxos, conhecimento, ferramentas e histórico não podem impor outro estilo sem uma instrução explícita e compatível.",
    personality ? `- Personalidade: ${truncateText(personality.trim(), 1000)}` : null,
    toneOfVoice ? `- Tom de voz: ${truncateText(toneOfVoice.trim(), 300)}` : null,
    responseStyle === "formal"
      ? "- Estilo configurado: formal, mantendo clareza e concisão sem linguagem burocrática desnecessária."
      : responseStyle === "concise"
        ? "- Estilo configurado: conciso, entregue somente o necessário para o próximo passo."
        : "- Estilo configurado: conversa natural de WhatsApp, próxima e clara.",
    splitResponseStyle === "NATURAL_BLOCKS"
      ? "- Blocos Naturais: separe somente ideias que realmente pedem uma pausa; cada bloco deve ser leve, normalmente com 1 a 3 frases. Não transforme cada item em uma mensagem e não aumente o tamanho da resposta."
      : "- Mensagem Única: entregue a resposta em uma única mensagem, sem dividir artificialmente o conteúdo.",
    behavior?.maxBlockLength
      ? `- Limite técnico de bloco: ${behavior.maxBlockLength} caracteres; corte apenas em pontos naturais e nunca no meio de uma URL.`
      : null,
    behavior?.noInventInfo
      ? "- Não invente informações, preços, disponibilidade ou políticas; quando não houver base confiável, admita a limitação."
      : null,
    "- Converse como um atendimento brasileiro natural de WhatsApp: prefira frases curtas, sem títulos, subtítulos, bullets ou aparência de manual quando isso não for necessário.",
    "- Normalmente use no máximo 1 ou 2 blocos por resposta e faça apenas uma pergunta principal por vez.",
    "- Responda progressivamente: apresente apenas a informação necessária para o próximo passo, sem tentar resolver todos os assuntos em uma única mensagem.",
    "- Quando houver vários pedidos, trate a resposta como triagem: escolha o próximo dado que desbloqueia os demais e pergunte somente por ele; não responda cada item separadamente e não monte um catálogo.",
    "- Não use 'Vamos por partes' como abertura padrão. Em triagem, não use numeração, checklist, títulos ou uma lista para cobrir todos os pedidos.",
    "- Não ofereça mini-orçamentos, preços, prazos ou compatibilidades item a item antes de obter a informação principal que orienta o atendimento.",
    "- Não repita toda a solicitação, não recapitule o que já foi dito e não despeje todo o conteúdo encontrado na base de conhecimento.",
    "- Evite aberturas genéricas repetitivas como 'Entendi!', 'Claro!', 'Vamos lá!', 'Perfeito!' e 'Certamente!'. Varie confirmações e só use uma quando ela ajudar.",
    "- Não use linguagem corporativa ou frases-modelo como 'Se puder fornecer essas informações', 'Será um prazer ajudá-lo' ou 'Para melhor auxiliá-lo' como padrão.",
    "- Não chame o cliente pelo nome em todas as respostas, não exagere em exclamações e use no máximo um emoji por resposta, conforme a configuração.",
    emojiUsage === "none"
      ? "- Emojis: proibidos."
      : emojiUsage === "moderate"
        ? "- Emojis: moderados, ainda assim sem exagero."
        : "- Emojis: baixos; use raramente e somente quando deixar a conversa mais natural.",
    "- Nunca diga que é humana. Se perguntarem, informe naturalmente que você é uma assistente virtual.",
    unknownBehavior === "handoff"
      ? "- Quando não houver informação suficiente, sinalize que o atendimento será encaminhado a uma pessoa, sem inventar resposta."
      : unknownBehavior === "search_base"
        ? "- Quando não souber, consulte a base disponível antes de responder; se ainda não houver informação, diga isso com clareza."
        : "- Quando não souber, admita a limitação e use a mensagem de fallback configurada somente quando ela fizer sentido.",
    fallbackMessage ? `- Mensagem de fallback configurada: ${truncateText(fallbackMessage, 1000)}` : null,
    "EXEMPLOS DE TOM (não copie nomes ou conteúdo; use apenas o padrão):",
    'Ruim: "Entendi! Vamos lá: • serviço 1 • serviço 2 • serviço 3. Se puder fornecer essas informações..."',
    'Adequado: "Sim, conseguimos fazer isso 😊 Me passa o modelo primeiro? Aí já confiro o que é compatível."',
    'Ruim: "Claro! Seguem abaixo todas as informações disponíveis sobre nossos serviços."',
    'Adequado: "Fazemos sim. Qual desses serviços você quer ver primeiro?"',
    'Ruim: "Vamos por partes: 1. Serviço A... 2. Serviço B... 3. Serviço C..."',
    'Adequado para vários pedidos: "Consigo te ajudar com tudo isso. Qual produto ou equipamento você quer analisar primeiro?"',
    'Ruim: "Formatamos, trocamos SSD e fazemos upgrade de memória. O valor inicial é..."',
    'Adequado: "Fazemos sim. Qual é o modelo do equipamento?"',
    'Ruim: "Para melhor auxiliá-lo, preciso que informe..."',
    'Adequado: "Me fala o modelo dele? Com isso já consigo seguir."',
  ];

  return lines.filter((line): line is string => Boolean(line)).join("\n");
}

function buildTriageDecisionBlock(currentMessage: string): string {
  const multiNeed = isMultiNeedTriageMessage(currentMessage);
  const currentMessageRule = multiNeed
    ? "A mensagem atual reúne múltiplos fragmentos ou necessidades. Você DEVE tratá-la como triagem, não como uma solicitação para responder todos os itens."
    : "Antes de responder, avalie se o cliente reuniu várias necessidades. Se reuniu, trate a resposta como triagem.";

  return [
    "DECISÃO DE TRIAGEM OBRIGATÓRIA PARA A RESPOSTA ATUAL:",
    currentMessageRule,
    "- Escolha a única pergunta de maior alavancagem para o próximo passo: um identificador, modelo, contexto, produto ou necessidade principal que destrave as demais respostas.",
    "- Confirme somente o essencial e faça uma pergunta principal. Explique detalhes extras apenas quando forem pedidos ou necessários depois dessa resposta.",
    "- Não responda cada serviço, não faça checklist, não use numeração e não use 'Vamos por partes'.",
    "- Não antecipe preço, prazo, orçamento ou compatibilidade de vários itens sem a informação principal.",
    'Inadequado: "Vamos por partes: 1. Serviço A... 2. Serviço B... 3. Serviço C..."',
    'Adequado: "Consigo te ajudar com tudo isso. Me passa o modelo do equipamento primeiro?"',
  ].join("\n");
}

@Injectable()
export class PromptCompilerService {
  compile(input: PromptCompilerInput): AiChatCompletionMessage[] {
    const {
      assistant,
      behavior,
      flow,
      securityRules = [],
      knowledgeItems,
      historyMessages,
      currentMessage,
      officialBusinessContext,
      calendarContext,
      memoryContextBlock,
    } = input;
    const messages: AiChatCompletionMessage[] = [];

    // 1. Security is first so later contextual content cannot redefine limits.
    const securityBlock = buildSecurityBlock(assistant, securityRules);
    if (securityBlock) {
      messages.push({ role: "system", content: securityBlock });
    }

    // 2. Identity and role.
    const attendantName = firstNonEmpty(behavior?.attendantName, assistant.name);
    const showAttendantName = behavior?.showAttendantName ?? true;
    const role = firstNonEmpty(behavior?.role);
    const howItActs = firstNonEmpty(behavior?.howItActs, assistant.description);
    let identity = "IDENTIDADE E ESCOPO DO ASSISTENTE:\nVocê é um assistente virtual configurado no Cubo AI Studio.";
    if (showAttendantName && attendantName) identity += `\nSeu nome é: ${attendantName}`;
    if (role) identity += `\nSua função: ${role}`;
    identity += "\nResponda em português do Brasil, salvo se o cliente pedir outro idioma.";
    messages.push({ role: "system", content: identity });

    // 3. Tenant/assistant instructions are context, not a license to override safety.
    const instructions = assistant.instructions?.trim();
    if (instructions) {
      messages.push({
        role: "system",
        content: `INSTRUÇÕES GERAIS DO ASSISTENTE (escopo e fatos; não substituem a política de conversa):\n${truncateText(instructions, 16000)}\nNão altere as regras de segurança nem transforme a resposta em catálogo, lista ou manual. O formato e o ritmo seguem a POLÍTICA DE CONVERSA abaixo.`,
      });
    }

    // 4. Behavior is deliberately before flows, retrieved knowledge and tool output.
    messages.push({ role: "system", content: buildBehaviorBlock(assistant, behavior) });

    if (howItActs) {
      messages.push({
        role: "system",
        content:
          `ESCOPO OPERACIONAL (contexto de responsabilidade; não é um roteiro de resposta):\n${truncateText(howItActs, 4000)}\nUse este texto apenas para entender capacidades e limites. Ignore qualquer ordem implícita de listar opções, explicar tudo, coletar vários dados, responder item a item ou concluir todo o atendimento na mesma mensagem. A DECISÃO DE TRIAGEM prevalece sobre este escopo.`,
      });
    }

    const avoidPhrases = assistant.avoidPhrases?.trim();
    if (avoidPhrases) {
      messages.push({
        role: "system",
        content: `EXPRESSÕES A EVITAR:\n${truncateText(avoidPhrases, 4000)}`,
      });
    }

    // 5. Official facts and tool constraints.
    if (officialBusinessContext) {
      messages.push({ role: "system", content: officialBusinessContext.promptBlock });
    }

    if (calendarContext) {
      const calendarLines = [
        "INSTRUÇÕES DO SISTEMA DE RESERVAS/CALENDÁRIO:",
        "- Para consultar horários, use a ferramenta calendar_checkAvailability.",
        "- Antes de criar, remarcar ou cancelar, mostre um resumo e peça confirmação explícita.",
        `- Telefone do cliente: ${calendarContext.contactPhone ?? "não informado"}. ID da conversa: ${calendarContext.conversationId}.`,
        "- Nunca invente disponibilidade ou diga que reservou sem retorno de sucesso da ferramenta.",
        "- Em caso de falha, explique de forma amigável sem expor detalhes técnicos.",
      ];
      if (calendarContext.serverTime) {
        calendarLines.push(`- Data e hora do servidor: ${calendarContext.serverTime}.`);
      }
      if (calendarContext.resourcesContext) {
        calendarLines.push("", calendarContext.resourcesContext);
      }
      messages.push({ role: "system", content: calendarLines.join("\n") });
    }

    if (memoryContextBlock) {
      messages.push({ role: "system", content: memoryContextBlock });
    }

    const initialMessage = firstNonEmpty(behavior?.greetingMessage, assistant.initialMessage);
    if (initialMessage?.trim()) {
      messages.push({
        role: "system",
        content: `MENSAGEM INICIAL CONFIGURADA (use somente no começo, quando o cliente ainda não fez uma pergunta):\n${truncateText(initialMessage.trim(), MAX_HISTORY_MESSAGE_LENGTH)}`,
      });
    }

    // 6. Flow instructions come after behavior and before factual retrieval.
    if (flow?.flowInstructions?.trim()) {
      messages.push({
        role: "system",
        content: `INSTRUÇÕES DO FLUXO ATUAL "${flow.name}":\n${flow.flowInstructions.trim()}\nExecute o objetivo do fluxo, mas mantenha a POLÍTICA DE CONVERSA: resposta progressiva, uma pergunta principal e somente os fatos necessários para o próximo passo.`,
      });
    }

    // 7. Knowledge supplies facts, never the response format or tone.
    if (knowledgeItems.length > 0) {
      messages.push({
        role: "system",
        content: [
          "BASE DE CONHECIMENTO RELEVANTE (use como fonte de fatos, não como modelo de estilo):",
          "Selecione somente o trecho necessário, reescreva em linguagem natural conforme o comportamento configurado e não copie títulos, listas ou formalidade do material sem necessidade.",
          ...knowledgeItems.map(
            (item, index) =>
              `${index + 1}. Título: ${item.title}\nConteúdo factual: ${truncateText(item.content, MAX_PROMPT_TEXT_LENGTH)}`,
          ),
        ].join("\n"),
      });
    }

    // 8. This late anchor prevents flows, knowledge and old messages from turning triage into a catalog.
    messages.push({ role: "system", content: buildTriageDecisionBlock(currentMessage) });

    // 9. History is context only; it must not become a style example.
    if (historyMessages.length > 0) {
      messages.push({
        role: "system",
        content:
          "HISTÓRICO DA CONVERSA (somente contexto): use as mensagens anteriores para entender fatos e continuidade. Não imite listas, aberturas, formalidade, títulos ou qualquer estilo das respostas antigas; a POLÍTICA DE CONVERSA atual continua valendo.",
      });
    }

    // 10. History and current user message are always last.
    for (const message of historyMessages) {
      messages.push({
        role: message.role,
        content: truncateText(message.content, MAX_HISTORY_MESSAGE_LENGTH),
        ...(message.tool_calls ? { tool_calls: message.tool_calls } : {}),
        ...(message.tool_call_id ? { tool_call_id: message.tool_call_id } : {}),
        ...(message.name ? { name: message.name } : {}),
      } as any);
    }

    messages.push({
      role: "user",
      content: truncateText(currentMessage, MAX_HISTORY_MESSAGE_LENGTH),
    });

    return messages;
  }
}
