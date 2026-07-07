import { Injectable } from "@nestjs/common";
import type { AiChatCompletionMessage } from "../ai/ai.types";
import { Assistant, AssistantBehavior, AssistantFlow } from "@prisma/client";

const MAX_HISTORY_MESSAGE_LENGTH = 1000;
const MAX_PROMPT_TEXT_LENGTH = 10000;

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength) + "... [texto truncado]";
}

export type PromptCompilerInput = {
  assistant: Partial<Assistant>;
  behavior?: AssistantBehavior | null;
  flow?: AssistantFlow | null;
  knowledgeItems: { title: string; content: string }[];
  historyMessages: any[]; // AiChatCompletionMessage array
  currentMessage: string;
  calendarContext?: {
    contactPhone?: string | null;
    conversationId: string;
    serverTime?: string | null;
    resourcesContext?: string | null;
  } | null;
};

@Injectable()
export class PromptCompilerService {
  compile(input: PromptCompilerInput): AiChatCompletionMessage[] {
    const { assistant, behavior, flow, knowledgeItems, historyMessages, currentMessage, calendarContext } = input;
    const messages: AiChatCompletionMessage[] = [];

    // 1. System Base / Identidade
    const attendantName = behavior?.attendantName ?? assistant.name;
    const showAttendantName = behavior?.showAttendantName ?? true;
    const role = behavior?.role;
    const howItActs = behavior?.howItActs ?? assistant.description;
    
    let identity = `Você é um assistente configurado no Cubo AI Studio.\n`;
    if (showAttendantName && attendantName) {
      identity += `Seu nome é: ${attendantName}\n`;
    }
    if (role) {
      identity += `Sua função: ${role}\n`;
    }
    if (howItActs) {
      identity += `Como você atua: ${howItActs}\n`;
    }
    
    identity += `\nResponda em português do Brasil, salvo se o usuário pedir outro idioma.`;
    
    messages.push({
      role: "system",
      content: identity,
    });

    // 2. Comportamento e Tom
    const personality = behavior?.personality ?? assistant.personality;
    const toneOfVoice = behavior?.toneOfVoice ?? assistant.toneOfVoice;
    const emojiUsage = behavior?.emojiUsage ?? "low";
    
    let behaviorInstructions = "REGRAS OBRIGATÓRIAS DE CONVERSA:\n";
    if (personality) behaviorInstructions += `- Personalidade: ${personality}\n`;
    if (toneOfVoice) behaviorInstructions += `- Tom de voz: ${toneOfVoice}\n`;
    if (emojiUsage === "none") behaviorInstructions += `- Uso de emojis: PROIBIDO. Não use nenhum emoji.\n`;
    if (emojiUsage === "low") behaviorInstructions += `- Uso de emojis: Baixo. Use raramente, apenas para dar um tom leve.\n`;
    if (emojiUsage === "moderate") behaviorInstructions += `- Uso de emojis: Moderado. Pode usar para deixar a conversa amigável.\n`;

    behaviorInstructions += 
      "- SAUDAÇÃO COM PERGUNTA/INTENÇÃO: Se o cliente cumprimentar e fizer uma pergunta na mesma mensagem, responda com uma saudação CURTA e responda diretamente à pergunta. É EXPRESSAMENTE PROIBIDO incluir perguntas de ajuda genéricas se o cliente já especificou o que quer.\n" +
      "- SAUDAÇÃO SEM PERGUNTA: Se o cliente enviar apenas saudações simples, cumprimente de volta e pergunte como pode ajudar.\n" +
      "- NÃO REPETIR SAUDAÇÃO: Se você já cumprimentou o cliente nesta conversa, não repita a saudação.\n" +
      "- MENSAGENS SEQUENCIAIS: O usuário pode enviar múltiplas mensagens curtas em sequência. Interprete TODAS como uma única intenção.\n" +
      "- ENCERRAMENTO: NÃO termine as mensagens oferecendo ajuda de forma repetitiva para respostas objetivas. Apenas responda e pare.";
      
    messages.push({
      role: "system",
      content: behaviorInstructions,
    });

    // 3. Avoid phrases
    const avoidPhrases = assistant.avoidPhrases?.trim();
    if (avoidPhrases) {
      messages.push({
        role: "system",
        content: `PROIBIÇÃO ABSOLUTA DE FRASES: As seguintes palavras ou frases estão PROIBIDAS em suas respostas:\n${avoidPhrases}`,
      });
    }

    // 4. Calendar Context (se aplicável)
    if (calendarContext) {
      const calendarLines = [
        "Instruções do Sistema de Reservas/Calendário:",
        "- Para consultar horários disponíveis, use a ferramenta 'calendar_checkAvailability'. Se houver várias opções, apresente no máximo 5 opções claras.",
        "- Antes de criar, remarcar ou cancelar um agendamento ou reserva, você DEVE apresentar um resumo claro dos detalhes (recurso/serviço, data, horário, nome e telefone) e pedir a confirmação explícita do usuário (ex: 'Confirmando: ..., posso confirmar?'). NUNCA chame as ferramentas de criação, remarcação ou cancelamento sem obter essa confirmação explícita.",
        `- Dados do cliente atual: Telefone: ${calendarContext.contactPhone}. ID da conversa: ${calendarContext.conversationId}.`,
        "- Nunca invente disponibilidade ou diga que reservou sem que a ferramenta retorne sucesso.",
        "- Se a ferramenta falhar, explique de forma amigável sem expor detalhes técnicos."
      ];
      if (calendarContext.serverTime) {
        calendarLines.push(`- Data e hora atual do servidor: ${calendarContext.serverTime}. Sempre utilize esta referência para interpretar expressões de data/hora relativas informadas pelo usuário.`);
      }
      if (calendarContext.resourcesContext) {
        calendarLines.push("", calendarContext.resourcesContext);
      }
      messages.push({
        role: "system",
        content: calendarLines.join("\n"),
      });
    }

    // 5. Initial message
    const initialMessage = behavior?.greetingMessage ?? assistant.initialMessage;
    if (initialMessage?.trim()) {
      messages.push({
        role: "system",
        content: `Mensagem inicial configurada do assistente (use SOMENTE quando o cliente ainda não fez nenhuma pergunta e a conversa está começando):\n${truncateText(initialMessage.trim(), MAX_HISTORY_MESSAGE_LENGTH)}`,
      });
    }

    // 6. Global Instructions
    const instructions = assistant.instructions?.trim();
    if (instructions) {
      messages.push({
        role: "system",
        content: `Instruções globais do assistente (siga rigorosamente, têm prioridade sobre comportamentos padrão):\n${instructions}`,
      });
    }

    // 7. Flow Instructions
    if (flow?.flowInstructions?.trim()) {
      messages.push({
        role: "system",
        content: `Instruções específicas para o fluxo atual "${flow.name}":\n${flow.flowInstructions.trim()}`,
      });
    }

    // 8. Knowledge
    if (knowledgeItems.length > 0) {
      messages.push({
        role: "system",
        content: [
          "Base de conhecimento relevante encontrada para o contexto atual:",
          ...knowledgeItems.map(
            (item, index) =>
              `${index + 1}. Título: ${item.title}\n   Conteúdo: ${truncateText(item.content, MAX_PROMPT_TEXT_LENGTH)}`,
          ),
        ].join("\n"),
      });
    }

    // 9. History
    for (const message of historyMessages) {
      messages.push({
        role: message.role,
        content: truncateText(message.content, MAX_HISTORY_MESSAGE_LENGTH),
        ...(message.tool_calls ? { tool_calls: message.tool_calls } : {}),
        ...(message.tool_call_id ? { tool_call_id: message.tool_call_id } : {}),
        ...(message.name ? { name: message.name } : {}),
      } as any);
    }

    // 10. Current Message
    messages.push({
      role: "user",
      content: truncateText(currentMessage, MAX_HISTORY_MESSAGE_LENGTH),
    });

    return messages;
  }
}
