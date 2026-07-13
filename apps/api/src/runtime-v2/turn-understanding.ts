import {
  type ConversationObjective,
  type ConfirmedFactInput,
  type RelevantQuestion,
  type TurnUnderstanding,
} from "./runtime-v2.types";

export type TurnUnderstandingInput = {
  message: string;
  messageId: string;
  lastRelevantQuestion?: RelevantQuestion | null;
  existingObjective?: ConversationObjective | null;
};

const SHORT_CONFIRMATIONS =
  /^(sim|não|nao|isso mesmo|pode ser|é esse|e esse|correto|exatamente|não sei|nao sei|pode continuar)(?:\s+(isso mesmo|é esse|correto|exatamente|é só melhoria))?[.!?\s]*$/i;

function includesAny(text: string, values: string[]): boolean {
  return values.some((value) => text.includes(value));
}

function fact(
  key: string,
  value: unknown,
  messageId: string,
  sourceType: ConfirmedFactInput["sourceType"] = "CUSTOMER_TEXT",
): ConfirmedFactInput {
  return {
    key,
    value,
    confidence: 0.9,
    sourceType,
    sourceMessageId: messageId,
  };
}

function deviceObjective(message: string, messageId: string): ConversationObjective | null {
  const match = message.match(
    /\b(acer(?:\s+nitro\s+5)?|mac\s+m1|macbook(?:\s+pro)?|notebook\s+[a-z0-9 -]+)\b/i,
  );
  if (!match) return null;
  return {
    key:
      /formatar|formatação|formatacao/i.test(message) && /mac\s+m1/i.test(message)
        ? "format_mac"
        : "device_service",
    label: "atendimento do equipamento",
    subject: match[1].trim(),
    sourceMessageId: messageId,
    confidence: 0.9,
  };
}

function factConfirmedByQuestion(
  question: RelevantQuestion,
  messageId: string,
): ConfirmedFactInput[] {
  if (question.fieldKey !== "device_model") return [];
  const match = question.prompt.match(
    /\b(acer(?:\s+nitro\s+5)?|mac\s+m1|macbook(?:\s+pro)?|dell(?:\s+[a-z0-9 -]+)?)\b/i,
  );
  return match ? [fact("device_model", match[1].trim(), messageId)] : [];
}

function questionFor(message: string, messageId: string): RelevantQuestion | null {
  if (message.includes("modelo") || message.includes("equipamento")) {
    return {
      key: "device_model",
      fieldKey: "device_model",
      prompt: "Qual é o modelo do equipamento?",
      sourceMessageId: messageId,
    };
  }
  return null;
}

export function understandTurn(input: TurnUnderstandingInput): TurnUnderstanding {
  const normalized = input.message.trim().replace(/\s+/g, " ");
  const lower = normalized.toLowerCase();
  const shortConfirmation = SHORT_CONFIRMATIONS.test(
    normalized
      .replace(/[,.!?]/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
  const explicitlyRequestsPreviousTopic = /\b(continuar|voltar|retomar)\b/.test(lower);
  const isSideQuestion = includesAny(lower, [
    "endereço",
    "endereco",
    "horário",
    "horario",
    "vocês buscam",
    "voces buscam",
    "conseguem buscar",
    "busca em domicílio",
    "busca em domicilio",
  ]);
  const requestedInformationCategories = [
    ...(includesAny(lower, ["quanto custa", "preço", "preco", "valor"]) ? ["price"] : []),
    ...(includesAny(lower, ["endereço", "endereco"]) ? ["address"] : []),
    ...(includesAny(lower, ["buscam", "buscar", "retirada", "domicílio", "domicilio"])
      ? ["pickup"]
      : []),
    ...(includesAny(lower, ["horário", "horario", "funcionamento"]) ? ["businessHours"] : []),
  ];

  if (shortConfirmation && input.lastRelevantQuestion) {
    return {
      turnIntent: "answer_previous_question",
      confidence: 0.97,
      objectiveAction: "KEEP",
      objective: input.existingObjective ?? null,
      factsExtracted: factConfirmedByQuestion(input.lastRelevantQuestion, input.messageId),
      correctedFactKeys: [],
      answeredQuestionKey: input.lastRelevantQuestion.key,
      isShortConfirmation: true,
      isSideQuestion: false,
      explicitlyRequestsPreviousTopic: false,
      requestedInformationCategories: [],
      nextQuestion: null,
      reasonCodes: ["SHORT_CONFIRMATION", "LAST_RELEVANT_QUESTION"],
      evidenceMessageIds: [
        input.messageId,
        ...(input.lastRelevantQuestion.sourceMessageId
          ? [input.lastRelevantQuestion.sourceMessageId]
          : []),
      ],
    };
  }

  if (/^(oi|olá|ola|bom dia|boa tarde|boa noite|tudo bem)[!.?,\s]*$/i.test(normalized)) {
    return {
      turnIntent: "greeting",
      confidence: 0.99,
      objectiveAction: "NONE",
      factsExtracted: [],
      correctedFactKeys: [],
      isShortConfirmation: false,
      isSideQuestion: false,
      explicitlyRequestsPreviousTopic: false,
      requestedInformationCategories: [],
      reasonCodes: ["GREETING_ONLY", "NO_ACTIVE_TOPIC"],
      evidenceMessageIds: [input.messageId],
    };
  }

  const objective = deviceObjective(normalized, input.messageId);
  const factsExtracted: ConfirmedFactInput[] = [];
  if (objective?.subject)
    factsExtracted.push(fact("device_model", objective.subject, input.messageId));
  if (includesAny(lower, ["formatar", "formatação", "formatacao"])) {
    factsExtracted.push(fact("requested_service_formatting", true, input.messageId));
  }
  if (includesAny(lower, ["ram", "memória", "memoria"])) {
    factsExtracted.push(fact("requested_service_memory_upgrade", true, input.messageId));
  }
  if (includesAny(lower, ["ssd", "disco"])) {
    factsExtracted.push(fact("requested_service_ssd", true, input.messageId));
  }
  if (includesAny(lower, ["salvar imagens", "pasta de projeto", "salvar arquivos"])) {
    factsExtracted.push(
      fact(
        "storage_requirements",
        {
          categories: [
            ...(lower.includes("imagem") ? ["images"] : []),
            ...(lower.includes("pasta") || lower.includes("arquivo") ? ["project_files"] : []),
          ],
        },
        input.messageId,
      ),
    );
  }

  const explicitNewObjective = Boolean(
    objective &&
    !input.existingObjective?.subject
      ?.toLowerCase()
      .includes(objective.subject?.toLowerCase() ?? ""),
  );
  const objectiveAction = explicitNewObjective
    ? "REPLACE"
    : input.existingObjective
      ? "KEEP"
      : "NONE";

  return {
    turnIntent: isSideQuestion
      ? "side_question"
      : requestedInformationCategories.includes("price")
        ? "ask_price"
        : explicitlyRequestsPreviousTopic
          ? "resume_objective"
          : "general_request",
    confidence:
      objective || isSideQuestion || requestedInformationCategories.length > 0 ? 0.9 : 0.65,
    objectiveAction,
    objective: objective ?? input.existingObjective ?? null,
    factsExtracted,
    correctedFactKeys: [],
    isShortConfirmation: false,
    isSideQuestion,
    explicitlyRequestsPreviousTopic,
    requestedInformationCategories,
    requestedAction: isSideQuestion ? "provide_official_information" : undefined,
    nextQuestion: questionFor(normalized, input.messageId),
    reasonCodes: [
      ...(isSideQuestion ? ["SIDE_QUESTION"] : []),
      ...(explicitNewObjective ? ["EXPLICIT_NEW_OBJECTIVE"] : []),
      ...(requestedInformationCategories.includes("price") ? ["EXPLICIT_PRICE_REQUEST"] : []),
    ],
    evidenceMessageIds: [input.messageId],
  };
}
