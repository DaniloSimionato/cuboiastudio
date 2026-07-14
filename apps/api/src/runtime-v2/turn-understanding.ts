import {
  type ConversationObjective,
  type ConfirmedFactInput,
  type RelevantQuestion,
  type TurnUnderstanding,
} from "./runtime-v2.types";

export type TurnUnderstandingInput = {
  message: string;
  messageId: string;
  contextVersion?: number;
  now?: Date;
  lastRelevantQuestion?: RelevantQuestion | null;
  existingObjective?: ConversationObjective | null;
};

const SHORT_CONFIRMATIONS =
  /^(sim|não|nao|isso mesmo|pode ser|é esse|e esse|correto|exatamente|não sei|nao sei|pode continuar)(?:\s+(isso mesmo|é esse|correto|exatamente|é só melhoria))?[.!?\s]*$/i;

const CUSTOMER_UNABLE_TO_ANSWER =
  /^(?:nao sei|não sei|nao entendo|não entendo|nao faco ideia|não faço ideia|nao sei explicar|não sei explicar|nao tenho essa informacao|não tenho essa informação|voc[eê]s podem verificar|prefiro levar para avaliar|depois voc[eê]s (?:olham|veem|verificam)|nao consigo conferir|não consigo conferir)\b/i;

function includesAny(text: string, values: string[]): boolean {
  return values.some((value) => text.includes(value));
}

function extractGenericDeviceModel(text: string): string | null {
  const match = text.match(
    /\b(?:meu|minha|o meu|a minha|um|uma|no|na|em|do|da|modelo(?:\s+(?:do|da))?|equipamento|notebook|computador|pc)\s+(?:(?:é|e|:)\s*)?(?:(?:um|uma)\s+)?([a-z][a-z0-9-]*(?:\s+[a-z][a-z0-9-]*){0,3}\s+[a-z]?\d+)\b/i,
  );
  return match?.[1]?.trim() ?? null;
}

function extractExplicitTopicSubject(text: string): string | null {
  const match = text.match(/\b(?:voltar\s+a\s+falar|falar|retomar)\s+(?:de|do|da|sobre|com)\s+([^.!?]+)/i);
  const subject = match?.[1]?.trim();
  return subject && !/^(?:isso|aquilo|esse assunto|o assunto|o tema)$/i.test(subject)
    ? subject
    : null;
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
  const subject = extractGenericDeviceModel(message) ?? extractExplicitTopicSubject(message);
  const isUpgradeRequest = /upgrade|ssd|memória|memoria|ram|mouse|teclado|fone|kit\s*gamer/i.test(
    message,
  );
  if (!subject && !isUpgradeRequest) return null;
  return {
    key:
      /formatar|formatação|formatacao/i.test(message) && subject
        ? "format_device"
        : /upgrade|ssd|memória|memoria|ram|mouse|teclado|fone|kit\s*gamer/i.test(message)
          ? "device_upgrade"
          : "device_service",
    label: "atendimento do equipamento",
    subject,
    sourceMessageId: messageId,
    confidence: 0.9,
  };
}

function factConfirmedByQuestion(
  question: RelevantQuestion,
  messageId: string,
  answer: string,
): ConfirmedFactInput[] {
  if (/^\s*n(?:ã|a)o\b/i.test(answer)) return [];
  if (question.fieldKey !== "device_model") return [];
  const subject = extractGenericDeviceModel(question.prompt);
  return subject ? [fact("device_model", subject, messageId)] : [];
}

function questionFor(
  message: string,
  messageId: string,
  contextVersion: number,
  askedAt: Date,
): RelevantQuestion | null {
  if (message.includes("modelo") || message.includes("equipamento")) {
    return {
      key: "device_model",
      fieldKey: "device_model",
      prompt: "Qual é o modelo do equipamento?",
      sourceMessageId: messageId,
      contextVersion,
      askedAt,
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
  const customerUnableToAnswer = CUSTOMER_UNABLE_TO_ANSWER.test(normalized);
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
  const weekdayMentioned =
    /\b(?:domingo|segunda(?:-feira)?|terça(?:-feira)?|terca(?:-feira)?|quarta(?:-feira)?|quinta(?:-feira)?|sexta(?:-feira)?|sábado|sabado)\b/.test(
      lower,
    );
  const requestedInformationCategories = [
    ...(includesAny(lower, ["quanto custa", "preço", "preco", "valor"]) ? ["price"] : []),
    ...(includesAny(lower, ["endereço", "endereco"]) ? ["address"] : []),
    ...(includesAny(lower, ["buscam", "buscar", "retirada", "domicílio", "domicilio"])
      ? ["pickup"]
      : []),
    ...(includesAny(lower, ["horário", "horario", "funcionamento"]) ? ["businessHours"] : []),
    ...(includesAny(lower, ["para agora", "imediato", "imediatamente"]) ? ["availability"] : []),
    ...(weekdayMentioned ? ["businessHours", "availability"] : []),
    ...(includesAny(lower, ["às ", "as ", "agendar", "agendamento"]) ? ["booking"] : []),
    ...(includesAny(lower, [
      "esperar",
      "aguardar",
      "depois de fechar",
      "após o horário",
      "apos o horario",
    ])
      ? ["exceptionRequest"]
      : []),
  ];

  if (customerUnableToAnswer && input.lastRelevantQuestion) {
    return {
      turnIntent: "unable_to_answer",
      confidence: 0.98,
      objectiveAction: "KEEP",
      objective: input.existingObjective ?? null,
      factsExtracted: [],
      correctedFactKeys: [],
      isShortConfirmation: shortConfirmation,
      confirmationAmbiguous: false,
      isSideQuestion: false,
      explicitlyRequestsPreviousTopic: false,
      requestedInformationCategories: [],
      nextQuestion: null,
      reasonCodes: ["CUSTOMER_UNABLE_TO_ANSWER", "CLEAR_LAST_RELEVANT_QUESTION"],
      evidenceMessageIds: [input.messageId],
    };
  }

  if (shortConfirmation && input.lastRelevantQuestion) {
    const questionBelongsToCurrentSession =
      input.lastRelevantQuestion.contextVersion === undefined ||
      input.lastRelevantQuestion.contextVersion === (input.contextVersion ?? 0);
    const isObjectiveQuestion = Boolean(input.lastRelevantQuestion.fieldKey);
    if (!questionBelongsToCurrentSession || !isObjectiveQuestion) {
      return {
        turnIntent: "ambiguous_confirmation",
        confidence: 0.55,
        objectiveAction: "KEEP",
        objective: input.existingObjective ?? null,
        factsExtracted: [],
        correctedFactKeys: [],
        isShortConfirmation: true,
        confirmationAmbiguous: true,
        isSideQuestion: false,
        explicitlyRequestsPreviousTopic: false,
        requestedInformationCategories: [],
        nextQuestion: null,
        reasonCodes: ["SHORT_CONFIRMATION", "AMBIGUOUS_REFERENCE"],
        evidenceMessageIds: [input.messageId],
      };
    }
    return {
      turnIntent: "answer_previous_question",
      confidence: 0.97,
      objectiveAction: "KEEP",
      objective: input.existingObjective ?? null,
      factsExtracted: factConfirmedByQuestion(
        input.lastRelevantQuestion,
        input.messageId,
        input.message,
      ),
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

  if (shortConfirmation) {
    return {
      turnIntent: "ambiguous_confirmation",
      confidence: 0.55,
      objectiveAction: "KEEP",
      objective: input.existingObjective ?? null,
      factsExtracted: [],
      correctedFactKeys: [],
      isShortConfirmation: true,
      confirmationAmbiguous: true,
      isSideQuestion: false,
      explicitlyRequestsPreviousTopic: false,
      requestedInformationCategories: [],
      nextQuestion: null,
      reasonCodes: ["SHORT_CONFIRMATION", "AMBIGUOUS_REFERENCE"],
      evidenceMessageIds: [input.messageId],
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

  const detectedObjective = deviceObjective(normalized, input.messageId);
  const objective = detectedObjective
    ? {
        ...detectedObjective,
        subject: detectedObjective.subject ?? input.existingObjective?.subject ?? null,
      }
    : null;
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
  if (includesAny(lower, ["mouse"])) {
    factsExtracted.push(fact("requested_accessory_mouse", true, input.messageId));
  }
  if (includesAny(lower, ["teclado"])) {
    factsExtracted.push(fact("requested_accessory_keyboard", true, input.messageId));
  }
  if (includesAny(lower, ["fone", "headset"])) {
    factsExtracted.push(fact("requested_accessory_headset", true, input.messageId));
  }
  if (includesAny(lower, ["kit gamer"])) {
    factsExtracted.push(fact("requested_accessory_gaming_kit", true, input.messageId));
  }

  const ssdCapacityMatch =
    lower.match(/ssd\s*(?:de|com)?\s*(\d+(?:[.,]\d+)?)\s*(gb|tb)?/) ??
    lower.match(/(\d+(?:[.,]\d+)?)\s*(gb|tb)\s+(?:de\s+)?ssd/);
  if (ssdCapacityMatch) {
    const amount = Number(ssdCapacityMatch[1].replace(",", "."));
    const unit = ssdCapacityMatch[2]?.toLowerCase();
    factsExtracted.push(
      fact("requested_ssd_capacity_gb", unit === "tb" ? amount * 1024 : amount, input.messageId),
    );
  }

  const ramCapacityMatch =
    lower.match(/(?:ram|mem[oó]ria)\s*(?:de|com)?\s*(\d+(?:[.,]\d+)?)\s*(gb|tb)?/) ??
    lower.match(/(\d+(?:[.,]\d+)?)\s*(gb|tb)\s+(?:de\s+)?(?:ram|mem[oó]ria)/);
  if (ramCapacityMatch) {
    const amount = Number(ramCapacityMatch[1].replace(",", "."));
    const unit = ramCapacityMatch[2]?.toLowerCase();
    factsExtracted.push(
      fact("requested_ram_capacity_gb", unit === "tb" ? amount * 1024 : amount, input.messageId),
    );
  }

  if (/\b(?:somente|s[oó])\s+isso\b/i.test(lower)) {
    factsExtracted.push(fact("scope_confirmed", true, input.messageId));
  }
  if (/\b(?:para agora|imediato|imediatamente)\b/i.test(lower)) {
    factsExtracted.push(fact("urgency", "immediate", input.messageId));
  }
  const weekdayMatch = lower.match(
    /\b(domingo|segunda(?:-feira)?|terça(?:-feira)?|terca(?:-feira)?|quarta(?:-feira)?|quinta(?:-feira)?|sexta(?:-feira)?|sábado|sabado)\b/,
  );
  if (weekdayMatch) {
    factsExtracted.push(fact("requested_day_of_week", weekdayMatch[1], input.messageId));
  }
  const requestedTimeMatch = lower.match(/(?:às|as)\s*(\d{1,2})(?::(\d{2}))?/);
  if (requestedTimeMatch) {
    factsExtracted.push(
      fact(
        "requested_time",
        `${requestedTimeMatch[1].padStart(2, "0")}:${requestedTimeMatch[2] ?? "00"}`,
        input.messageId,
      ),
    );
  }
  const customerTimeMatch = lower.match(
    /(?:saio|sairei|chego|chegarei).*?(?:às|as)\s*(\d{1,2})(?::(\d{2}))?/,
  );
  const exceptionRequest = /(?:esperar|aguardar|depois de fechar|ap[oó]s o hor[aá]rio)/i.test(
    lower,
  );
  if (customerTimeMatch) {
    factsExtracted.push(
      fact(
        "customer_availability_after",
        `${customerTimeMatch[1].padStart(2, "0")}:${customerTimeMatch[2] ?? "00"}`,
        input.messageId,
      ),
    );
  }
  if (exceptionRequest) {
    factsExtracted.push(fact("exception_request", true, input.messageId));
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
    (objective.key !== input.existingObjective?.key ||
      !input.existingObjective?.subject
        ?.toLowerCase()
        .includes(objective.subject?.toLowerCase() ?? "")),
  );
  const objectiveAction = explicitNewObjective
    ? "REPLACE"
    : input.existingObjective
      ? "KEEP"
      : "NONE";

  const turnIntent = isSideQuestion
    ? "side_question"
    : requestedInformationCategories.includes("price")
      ? "ask_price"
      : /\b(?:para agora|imediato|imediatamente)\b/i.test(lower)
        ? "ask_availability"
        : weekdayMatch
          ? "request_booking_date"
          : exceptionRequest
            ? "exception_request"
            : requestedTimeMatch
              ? "request_booking_time"
              : explicitlyRequestsPreviousTopic
                ? "resume_objective"
                : "general_request";
  const requestedAction =
    turnIntent === "ask_availability" ||
    turnIntent === "request_booking_date" ||
    turnIntent === "request_booking_time"
      ? "availability"
      : turnIntent === "exception_request"
        ? "exception_request"
        : isSideQuestion
          ? "provide_official_information"
          : undefined;

  return {
    turnIntent,
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
    requestedAction,
    nextQuestion: questionFor(
      normalized,
      input.messageId,
      input.contextVersion ?? 0,
      input.now ?? new Date(),
    ),
    reasonCodes: [
      ...(isSideQuestion ? ["SIDE_QUESTION"] : []),
      ...(explicitNewObjective ? ["EXPLICIT_NEW_OBJECTIVE"] : []),
      ...(requestedInformationCategories.includes("price") ? ["EXPLICIT_PRICE_REQUEST"] : []),
    ],
    evidenceMessageIds: [input.messageId],
  };
}
