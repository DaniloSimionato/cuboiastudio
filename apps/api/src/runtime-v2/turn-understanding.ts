import {
  type ConversationObjective,
  type ConfirmedFactInput,
  type HumanHandoffSignal,
  type RelevantQuestion,
  type TurnUnderstanding,
  type UsefulHistoryMessage,
} from "./runtime-v2.types";

export type TurnUnderstandingInput = {
  message: string;
  messageId: string;
  contextVersion?: number;
  now?: Date;
  lastRelevantQuestion?: RelevantQuestion | null;
  existingObjective?: ConversationObjective | null;
  /**
   * Ephemeral, bounded signal derived from the current conversation history.
   * It is used only to resolve short follow-ups such as "E durante a semana?".
   */
  recentBusinessHoursTopic?: boolean;
  /** Up to six recent messages from the same scoped conversation, in chronological order. */
  recentHistory?: UsefulHistoryMessage[];
};

const SHORT_CONFIRMATIONS =
  /^(sim|não|nao|isso mesmo|pode ser|é esse|e esse|correto|exatamente|não sei|nao sei|pode continuar)(?:\s+(isso mesmo|é esse|correto|exatamente|é só melhoria))?[.!?\s]*$/i;

const CUSTOMER_UNABLE_TO_ANSWER =
  /^(?:nao sei|não sei|nao entendo|não entendo|nao faco ideia|não faço ideia|nao sei explicar|não sei explicar|nao tenho essa informacao|não tenho essa informação|voc[eê]s podem verificar|prefiro levar para avaliar|depois voc[eê]s (?:olham|veem|verificam)|nao consigo conferir|não consigo conferir)\b/i;

function includesAny(text: string, values: string[]): boolean {
  return values.some((value) => text.includes(value));
}

function normalizeCategoryText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function isBusinessHoursFollowUp(value: string): boolean {
  return /^(?:e\s+)?(?:durante\s+a\s+semana|nos?\s+dias\s+uteis|de\s+segunda\s+a\s+sexta)\??$/.test(
    value.trim(),
  );
}

type FollowUpResolution = {
  detected: boolean;
  status: "NOT_APPLICABLE" | "RESOLVED" | "AMBIGUOUS" | "REJECTED";
  topic: "BUSINESS_HOURS" | null;
  historyMessagesConsidered: number;
  sourceFingerprint: string | null;
  confidence: number | null;
  ambiguityDetected: boolean;
  topicChanged: boolean;
  reasonCode: string | null;
};

function isBusinessHoursText(value: string): boolean {
  const normalized = normalizeCategoryText(value);
  return /(?:\bhorario\b|funcionamento|expediente|\babert(?:o|a|os|as)\b|\babre\b|\babrem\b|\bfunciona(?:m)?\b|\bfecha\b|\bfecham\b|que horas|almoco)/.test(
    normalized,
  );
}

type ExplicitTopicChange = {
  changed: boolean;
  reasonCode: "EXPLICIT_TOPIC_CHANGE" | null;
};

function detectExplicitTopicChange(value: string): ExplicitTopicChange {
  const normalized = normalizeCategoryText(value);
  const explicitMarker =
    /(?:\bagora\s+(?:outro\s+)?assunto\b|\bmudando\s+de\s+assunto\b|\bfalando\s+de\s+outra\s+coisa\b|\btenho\s+outra\s+duvida\b|\besquece\s+isso\b)/.test(
      normalized,
    );
  return {
    changed: explicitMarker,
    reasonCode: explicitMarker ? "EXPLICIT_TOPIC_CHANGE" : null,
  };
}

function isExplicitTopicChange(value: string): boolean {
  return detectExplicitTopicChange(value).changed;
}

function isRecentCompetingTopic(value: string): boolean {
  const normalized = normalizeCategoryText(value);
  return (
    isExplicitTopicChange(normalized) ||
    /(?:quanto custa|preco|valor|orcamento|prazo|fica pronto|entregam|entrega|visita|agendar|agendamento|notebook nao liga|falar com (?:uma )?pessoa|atendente|humano)/.test(
      normalized,
    )
  );
}

function isEllipticalFollowUp(value: string): boolean {
  return /^(?:e\s+)?(?:nos?\s+(?:outros|demais)(?:\s+dias)?|durante\s+a\s+semana|nos?\s+dias\s+uteis|de\s+segunda\s+a\s+sexta|no\s+sabado|la|depois|nesse\s+caso)\??$/.test(
    value.trim(),
  );
}

function resolveImplicitFollowUp(input: {
  currentMessage: string;
  history?: UsefulHistoryMessage[];
  fallbackBusinessHoursTopic?: boolean;
}): FollowUpResolution {
  const current = normalizeCategoryText(input.currentMessage.trim().replace(/\s+/g, " "));
  const history = (input.history ?? []).slice(-6);
  const explicitTopicChange = detectExplicitTopicChange(current);
  if (explicitTopicChange.changed) {
    return {
      detected: false,
      status: "NOT_APPLICABLE",
      topic: null,
      historyMessagesConsidered: history.length,
      sourceFingerprint: null,
      confidence: null,
      ambiguityDetected: false,
      topicChanged: true,
      reasonCode: explicitTopicChange.reasonCode,
    };
  }
  if (!isEllipticalFollowUp(current) || isBusinessHoursText(current)) {
    return {
      detected: false,
      status: "NOT_APPLICABLE",
      topic: null,
      historyMessagesConsidered: history.length,
      sourceFingerprint: null,
      confidence: null,
      ambiguityDetected: false,
      topicChanged: false,
      reasonCode: null,
    };
  }
  const businessHoursMessages = history.filter((item) => isBusinessHoursText(item.content));
  const competingTopic = history.some((item) => isRecentCompetingTopic(item.content));
  if ((businessHoursMessages.length === 0 && !input.fallbackBusinessHoursTopic) || competingTopic) {
    return {
      detected: true,
      status: "AMBIGUOUS",
      topic: null,
      historyMessagesConsidered: history.length,
      sourceFingerprint: null,
      confidence: null,
      ambiguityDetected: true,
      topicChanged: false,
      reasonCode: competingTopic ? "RECENT_TOPICS_CONFLICT" : "NO_RECENT_TOPIC",
    };
  }
  const source = businessHoursMessages.at(-1) ?? null;
  return {
    detected: true,
    status: "RESOLVED",
    topic: "BUSINESS_HOURS",
    historyMessagesConsidered: history.length,
    sourceFingerprint: source?.id ?? null,
    confidence: 0.94,
    ambiguityDetected: false,
    topicChanged: false,
    reasonCode: "RECENT_BUSINESS_HOURS_TOPIC",
  };
}

export function deriveHumanHandoffSignal(message: string): HumanHandoffSignal {
  const normalized = message.trim().replace(/\s+/g, " ");
  const categoryText = normalizeCategoryText(normalized);
  const explicitCustomerRequest =
    /\b(?:quero|gostaria|preciso|necessito)\s+(?:de\s+)?(?:falar|conversar)\s+com\s+(?:um[a]?\s+)?(?:atendente|humano|pessoa|alguem)\b/.test(
      categoryText,
    ) ||
    /\b(?:quero|gostaria|preciso|necessito)\s+(?:de\s+)?atendimento\s+humano\b/.test(
      categoryText,
    ) ||
    /\b(?:transfira|transfere|transferir|chame|chamar)\s+(?:para\s+)?(?:um[a]?\s+)?(?:atendente|humano|pessoa|alguem)\b/.test(
      categoryText,
    ) ||
    /\b(?:pode|podem)\s+(?:me\s+)?(?:chamar|transferir)\s+(?:para\s+)?(?:um[a]?\s+)?(?:atendente|humano|pessoa|alguem)\b/.test(
      categoryText,
    );
  const explicitPreference =
    /\bprefiro\s+(?:falar|conversar)\s+com\s+(?:um[a]?\s+)?(?:atendente|humano|pessoa|alguem)\b/.test(
      categoryText,
    ) ||
    /\bnao\s+quero\s+(?:continuar|falar)\s+com\s+(?:a\s+)?ia\b/.test(categoryText) ||
    /\bquero\s+falar\s+com\s+(?:o\s+)?suporte\b/.test(categoryText) ||
    /\btem\s+(?:alguem|uma\s+pessoa)\s+para\s+me\s+atender\b/.test(categoryText);
  const requested = explicitCustomerRequest || explicitPreference;

  return {
    requested,
    source: requested ? "EXPLICIT_CUSTOMER_REQUEST" : null,
    confidence: requested ? 0.99 : 0,
    reasonCode: requested ? "CUSTOMER_REQUESTED_HUMAN" : null,
    requestedTargetType: requested ? "ANY_HUMAN" : null,
    customerRequested: requested,
    derivedAtStage: "TURN_UNDERSTANDING",
    redactionApplied: true,
  };
}

function extractGenericDeviceModel(text: string): string | null {
  const match = text.match(
    /\b(?:meu|minha|o meu|a minha|um|uma|no|na|em|do|da|modelo(?:\s+(?:do|da))?|equipamento|notebook|computador|pc)\s+(?:(?:é|e|:)\s*)?(?:(?:um|uma)\s+)?([a-z][a-z0-9-]*(?:\s+[a-z][a-z0-9-]*){0,3}\s+[a-z]?\d+)\b/i,
  );
  return match?.[1]?.trim() ?? null;
}

function extractExplicitTopicSubject(text: string): string | null {
  const match = text.match(
    /\b(?:voltar\s+a\s+falar|falar|retomar)\s+(?:de|do|da|sobre|com)\s+([^.!?]+)/i,
  );
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
  const categoryText = normalizeCategoryText(normalized);
  const humanHandoffSignal = deriveHumanHandoffSignal(normalized);
  const shortConfirmation = SHORT_CONFIRMATIONS.test(
    normalized
      .replace(/[,.!?]/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
  const customerUnableToAnswer = CUSTOMER_UNABLE_TO_ANSWER.test(normalized);
  const isNonFactualConversation =
    /^(?:obrigad[oa]|valeu|entendi|tudo bem|ok(?:ay)?|certo|beleza)[!.?\s]*$/i.test(normalized);
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
    /\b(?:domingos?|segunda(?:-feira)?s?|terça(?:-feira)?s?|terca(?:-feira)?s?|quarta(?:-feira)?s?|quinta(?:-feira)?s?|sexta(?:-feira)?s?|sábados?|sabados?)\b/.test(
      lower,
    );
  const asksIndividualSchedule =
    /\b(?:minha|meu)\s+(?:visita|entrega|equipamento|agendamento)\b/.test(categoryText) ||
    /\b(?:visita|entrega|agendamento)\b.*\b(?:individual|confirmad)/.test(categoryText);
  const explicitBusinessHoursLanguage =
    !asksIndividualSchedule &&
    (/\bhorario\b|funcionamento|expediente|\babert(?:o|a|os|as)\b|\babre\b|\babrem\b|\bfunciona(?:m)?\b|\bfecha\b|\bfecham\b|que horas/.test(
      categoryText,
    ) ||
      (weekdayMentioned && /\b(?:atende|atendem)\b/.test(categoryText)));
  const implicitFollowUp = resolveImplicitFollowUp({
    currentMessage: normalized,
    history: input.recentHistory,
    fallbackBusinessHoursTopic: input.recentBusinessHoursTopic,
  });
  const followsBusinessHoursTopic =
    implicitFollowUp.status === "RESOLVED" && implicitFollowUp.topic === "BUSINESS_HOURS";
  const inheritanceEvaluated = implicitFollowUp.detected || implicitFollowUp.topicChanged;
  const inheritanceAllowed = followsBusinessHoursTopic && !implicitFollowUp.topicChanged;
  const inheritanceBlockReason = implicitFollowUp.topicChanged
    ? "EXPLICIT_TOPIC_CHANGE"
    : implicitFollowUp.status === "AMBIGUOUS"
      ? implicitFollowUp.reasonCode
      : null;
  const ambiguousBusinessHoursFollowUp = implicitFollowUp.status === "AMBIGUOUS";
  const asksBusinessHours = explicitBusinessHoursLanguage || followsBusinessHoursTopic;
  const asksOfficialContact =
    /(?:telefone oficial|whatsapp(?: oficial)?|numero(?: para contato| oficial)?|contato oficial|como falar com (?:voces|a empresa))/.test(
      categoryText,
    );
  const asksContactPreference =
    /(?:prefiro (?:receber )?retorno|prefiro (?:ser )?contatad[oa]|me (?:chame|contate|fale) por|como prefiro receber retorno|pode falar comigo pelo)/.test(
      categoryText,
    );
  const asksAvailability =
    /(?:disponibilidade|tem vaga|ha vaga|pode atender|consegue atender|atendem .*amanha|disponivel .*amanha|para agora|imediato|imediatamente)/.test(
      categoryText,
    );
  const asksBooking =
    /(?:agendar|agendamento|reservar|reserva|marcar|confirmar (?:o )?(?:horario|atendimento|agendamento))/.test(
      categoryText,
    );
  const asksTechnicalInformation =
    /(?:reparo|conserto|upgrade|ssd|ram|memoria|equipamento|notebook|computador|capacidade tecnica|instalar componente|melhoria|compatibilidade)/.test(
      categoryText,
    );
  const exceptionRequest = /(?:esperar|aguardar|depois de fechar|apos o horario)/.test(
    categoryText,
  );
  let requestedInformationCategories = [
    ...(includesAny(categoryText, [
      "quanto custa",
      "quanto vai custar",
      "preco",
      "valor",
      "orcamento",
    ])
      ? ["price"]
      : []),
    ...(includesAny(categoryText, ["endereco"]) ? ["address"] : []),
    ...(includesAny(categoryText, [
      "buscam",
      "buscar",
      "retirada",
      "domicilio",
      "coleta",
      "entrega",
    ])
      ? ["pickup"]
      : []),
    ...(asksBusinessHours ? ["businessHours"] : []),
    ...(asksOfficialContact && !asksContactPreference ? ["officialContact"] : []),
    ...(asksContactPreference ? ["contactPreference"] : []),
    ...(asksTechnicalInformation ? ["technicalInformation"] : []),
    ...(/\bgarantia\b/.test(categoryText) ? ["warranty"] : []),
    ...(asksAvailability ? ["availability"] : []),
    ...(asksBooking ? ["booking"] : []),
    ...(weekdayMentioned &&
    !asksIndividualSchedule &&
    !asksBusinessHours &&
    !asksAvailability &&
    !asksBooking &&
    !exceptionRequest
      ? ["businessHours", "availability"]
      : []),
    ...(!asksBusinessHours &&
    !asksAvailability &&
    !asksBooking &&
    !exceptionRequest &&
    /(?:as)\s*\d{1,2}/.test(categoryText)
      ? ["booking"]
      : []),
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
  if (humanHandoffSignal.requested) requestedInformationCategories = [];
  const requestedCategoryDerivation: Record<string, string> = {};
  for (const category of requestedInformationCategories) {
    requestedCategoryDerivation[category] =
      category === "businessHours"
        ? followsBusinessHoursTopic
          ? (implicitFollowUp.reasonCode ?? "RECENT_BUSINESS_HOURS_TOPIC")
          : "EXPLICIT_OPERATING_HOURS_LANGUAGE"
        : category === "officialContact"
          ? "EXPLICIT_OFFICIAL_CONTACT_LANGUAGE"
          : category === "contactPreference"
            ? "EXPLICIT_CONTACT_PREFERENCE_LANGUAGE"
            : category === "technicalInformation"
              ? "TECHNICAL_SERVICE_OR_EQUIPMENT_LANGUAGE"
              : category === "warranty"
                ? "EXPLICIT_WARRANTY_LANGUAGE"
                : category === "availability"
                  ? "EXPLICIT_AVAILABILITY_LANGUAGE"
                  : category === "booking"
                    ? "EXPLICIT_RESERVATION_LANGUAGE"
                    : "EXPLICIT_CATEGORY_ALIAS";
  }

  if (customerUnableToAnswer && input.lastRelevantQuestion) {
    return {
      turnIntent: "unable_to_answer",
      confidence: 0.98,
      humanHandoffSignal,
      objectiveAction: "KEEP",
      objective: input.existingObjective ?? null,
      factsExtracted: [],
      correctedFactKeys: [],
      isShortConfirmation: shortConfirmation,
      confirmationAmbiguous: false,
      isSideQuestion: false,
      explicitlyRequestsPreviousTopic: false,
      requestedInformationCategories: [],
      requestedCategoryDerivation: {},
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
        humanHandoffSignal,
        objectiveAction: "KEEP",
        objective: input.existingObjective ?? null,
        factsExtracted: [],
        correctedFactKeys: [],
        isShortConfirmation: true,
        confirmationAmbiguous: true,
        isSideQuestion: false,
        explicitlyRequestsPreviousTopic: false,
        requestedInformationCategories: [],
        requestedCategoryDerivation: {},
        nextQuestion: null,
        reasonCodes: ["SHORT_CONFIRMATION", "AMBIGUOUS_REFERENCE"],
        evidenceMessageIds: [input.messageId],
      };
    }
    return {
      turnIntent: "answer_previous_question",
      confidence: 0.97,
      humanHandoffSignal,
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
      requestedCategoryDerivation: {},
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
      humanHandoffSignal,
      objectiveAction: "KEEP",
      objective: input.existingObjective ?? null,
      factsExtracted: [],
      correctedFactKeys: [],
      isShortConfirmation: true,
      confirmationAmbiguous: true,
      isSideQuestion: false,
      explicitlyRequestsPreviousTopic: false,
      requestedInformationCategories: [],
      requestedCategoryDerivation: {},
      nextQuestion: null,
      reasonCodes: ["SHORT_CONFIRMATION", "AMBIGUOUS_REFERENCE"],
      evidenceMessageIds: [input.messageId],
    };
  }

  if (/^(oi|olá|ola|bom dia|boa tarde|boa noite|tudo bem)[!.?,\s]*$/i.test(normalized)) {
    return {
      turnIntent: "greeting",
      confidence: 0.99,
      humanHandoffSignal,
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

  let turnIntent = "general_request";
  if (humanHandoffSignal.requested) turnIntent = "human_support_request";
  else if (requestedInformationCategories.includes("price")) turnIntent = "ask_price";
  else if (weekdayMentioned && !asksBusinessHours && !asksAvailability && !asksBooking)
    turnIntent = "request_booking_date";
  else if (requestedInformationCategories.includes("businessHours"))
    turnIntent = "ask_business_hours";
  else if (requestedInformationCategories.includes("officialContact"))
    turnIntent = "ask_official_contact";
  else if (requestedInformationCategories.includes("contactPreference"))
    turnIntent = "ask_contact_preference";
  else if (requestedInformationCategories.includes("warranty")) turnIntent = "ask_warranty";
  else if (requestedInformationCategories.includes("technicalInformation"))
    turnIntent = "technical_information";
  else if (requestedInformationCategories.includes("availability")) turnIntent = "ask_availability";
  else if (requestedInformationCategories.includes("booking")) turnIntent = "request_booking";
  else if (isSideQuestion) turnIntent = "side_question";
  else if (requestedInformationCategories.includes("pickup")) turnIntent = "request_pickup";
  else if (exceptionRequest) turnIntent = "exception_request";
  else if (explicitlyRequestsPreviousTopic) turnIntent = "resume_objective";
  const requestedAction =
    turnIntent === "ask_availability" || turnIntent === "request_booking"
      ? "availability"
      : turnIntent === "exception_request"
        ? "exception_request"
        : isSideQuestion
          ? "provide_official_information"
          : undefined;
  const priorBusinessHoursTopic = (input.recentHistory ?? [])
    .slice(-6)
    .some((item) => isBusinessHoursText(item.content));
  const currentTopic =
    turnIntent === "human_support_request"
      ? "HUMAN_SUPPORT"
      : turnIntent === "technical_information"
        ? "TECHNICAL_INFORMATION"
        : requestedInformationCategories.includes("warranty")
          ? "WARRANTY"
          : null;

  return {
    turnIntent,
    confidence:
      humanHandoffSignal.requested ||
      objective ||
      isSideQuestion ||
      requestedInformationCategories.length > 0
        ? 0.9
        : 0.65,
    humanHandoffSignal,
    objectiveAction,
    objective: objective ?? input.existingObjective ?? null,
    factsExtracted,
    correctedFactKeys: [],
    isShortConfirmation: false,
    requiresClarification: ambiguousBusinessHoursFollowUp,
    followUpDetected: implicitFollowUp.detected,
    followUpResolutionStatus: implicitFollowUp.status,
    inheritedTopic: implicitFollowUp.topic,
    inheritedFactualCategory: implicitFollowUp.topic,
    historyMessagesConsidered: implicitFollowUp.historyMessagesConsidered,
    inheritedFromMessageFingerprint: implicitFollowUp.sourceFingerprint,
    inheritedFromConversationId: followsBusinessHoursTopic ? "CURRENT_CONVERSATION" : null,
    inheritedFromRecentContext: followsBusinessHoursTopic,
    resolutionConfidence: implicitFollowUp.confidence,
    ambiguityDetected: implicitFollowUp.ambiguityDetected,
    topicChanged: implicitFollowUp.topicChanged,
    previousTopic:
      implicitFollowUp.topicChanged && priorBusinessHoursTopic ? "BUSINESS_HOURS" : null,
    currentTopic,
    topicChangeReason: implicitFollowUp.topicChanged ? implicitFollowUp.reasonCode : null,
    inheritedTopicSuppressed: implicitFollowUp.topicChanged && priorBusinessHoursTopic,
    inheritanceEvaluated,
    inheritanceAllowed,
    inheritanceBlockReason,
    resolutionReasonCode: implicitFollowUp.reasonCode,
    isSideQuestion,
    isNonFactualConversation,
    explicitlyRequestsPreviousTopic,
    requestedInformationCategories,
    requestedCategoryDerivation,
    requestedAction,
    nextQuestion: questionFor(
      normalized,
      input.messageId,
      input.contextVersion ?? 0,
      input.now ?? new Date(),
    ),
    reasonCodes: [
      ...(humanHandoffSignal.requested ? ["EXPLICIT_HUMAN_HANDOFF_REQUEST"] : []),
      ...(isSideQuestion ? ["SIDE_QUESTION"] : []),
      ...(explicitNewObjective ? ["EXPLICIT_NEW_OBJECTIVE"] : []),
      ...(requestedInformationCategories.includes("price") ? ["EXPLICIT_PRICE_REQUEST"] : []),
      ...(ambiguousBusinessHoursFollowUp ? ["AMBIGUOUS_BUSINESS_HOURS_FOLLOW_UP"] : []),
    ],
    evidenceMessageIds: [input.messageId],
  };
}
