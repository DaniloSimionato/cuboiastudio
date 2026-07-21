import assert from "node:assert/strict";
import test from "node:test";
import {
  InMemoryConversationStateStore,
  RuntimeV2ShadowOrchestrator,
  understandTurn,
} from "../dist/runtime-v2/index.js";
import { buildOfficialBusinessContext } from "../dist/assistants/official-business-context.js";
import { validateV1AnswerAuthority } from "../dist/assistant-conversations/runtime-authority-guard.js";
import { ensureMultiIntentResponseCoverage } from "../dist/assistant-conversations/multi-intent-response-coverage.js";
import { buildMultiIntentTurn } from "../dist/intent-router/intent-routing.js";

const scope = {
  companyId: "authority-company",
  assistantId: "authority-assistant",
  conversationId: "authority-conversation",
  contextVersion: 7,
};
const environment = {
  RUNTIME_V2_MODE: "SHADOW",
  RUNTIME_V2_SHADOW_ASSISTANT_IDS: scope.assistantId,
  RUNTIME_V2_SHADOW_CONVERSATION_IDS: scope.conversationId,
};

function snapshot(id, message, extra = {}) {
  return {
    scope,
    correlationId: `correlation-${id}`,
    internalMessageId: id,
    externalMessageId: `external-${id}`,
    source: "CUSTOMER",
    messageType: "TEXT",
    currentMessage: message,
    ...extra,
  };
}

function officialContext() {
  return buildOfficialBusinessContext(
    {
      companyName: "Empresa de teste",
      companyTimezone: "America/Sao_Paulo",
      weeklySchedule: {
        monday: [{ start: "08:00", end: "18:00" }],
        sunday: [],
      },
    },
    new Date("2026-07-13T15:00:00.000Z"),
  );
}

function officialContextForCompany({ companyName, weeklySchedule, now }) {
  return buildOfficialBusinessContext(
    {
      companyName,
      companyTimezone: "America/Campo_Grande",
      weeklySchedule,
    },
    now,
  );
}

test("sessão nova não herda pergunta antiga e aceita referência somente da sessão atual", async () => {
  const store = new InMemoryConversationStateStore();
  const now = new Date("2026-07-13T15:00:00.000Z");
  const orchestrator = new RuntimeV2ShadowOrchestrator(store, environment, () => now);

  const first = await orchestrator.process(snapshot("message-1", "Bom dia."));
  const stale = await orchestrator.process(
    snapshot("message-2", "Sim, isso mesmo.", {
      lastRelevantQuestion: {
        key: "device_model",
        fieldKey: "device_model",
        prompt: "Seu equipamento é um Acer Nitro 5?",
        sourceMessageId: "old-question",
        contextVersion: scope.contextVersion,
        askedAt: new Date("2026-07-12T15:00:00.000Z"),
      },
    }),
  );
  assert.equal(first.manifest.currentObjective, null);
  assert.equal(stale.manifest.lastRelevantQuestionKey, null);
  assert.equal(stale.manifest.turnIntent, "ambiguous_confirmation");

  const current = await orchestrator.process(
    snapshot("message-3", "Sim, isso mesmo.", {
      lastRelevantQuestion: {
        key: "device_model",
        fieldKey: "device_model",
        prompt: "Seu equipamento é um Acer Nitro 5?",
        sourceMessageId: "current-question",
        contextVersion: scope.contextVersion,
        askedAt: new Date("2026-07-13T15:00:00.000Z"),
      },
    }),
  );
  assert.equal(current.manifest.lastRelevantQuestionKey, "device_model");
  assert.ok(current.manifest.confirmedFactKeysAdded.includes("device_model"));
});

test("pergunta aberta seguida de confirmação curta permanece ambígua", () => {
  const understanding = understandTurn({
    message: "Sim, isso mesmo.",
    messageId: "confirmation",
    contextVersion: 7,
    lastRelevantQuestion: {
      key: "open_question",
      prompt: "O que você precisa saber sobre o equipamento?",
      sourceMessageId: "question",
      contextVersion: 7,
      askedAt: new Date("2026-07-13T15:00:00.000Z"),
    },
  });
  assert.equal(understanding.isShortConfirmation, true);
  assert.equal(understanding.confirmationAmbiguous, true);
  assert.equal(understanding.answeredQuestionKey, undefined);
  assert.deepEqual(understanding.factsExtracted, []);
});

test("pergunta objetiva distingue sim de não e não herda referente após reset", async () => {
  const question = {
    key: "device_model",
    fieldKey: "device_model",
    prompt: "Seu notebook é um Acer Nitro 5?",
    sourceMessageId: "question-current",
    contextVersion: 7,
    askedAt: new Date("2026-07-13T15:00:00.000Z"),
  };
  const yes = understandTurn({
    message: "Sim, isso mesmo.",
    messageId: "yes",
    contextVersion: 7,
    lastRelevantQuestion: question,
  });
  assert.equal(yes.answeredQuestionKey, "device_model");
  assert.deepEqual(
    yes.factsExtracted.map((fact) => fact.key),
    ["device_model"],
  );

  const no = understandTurn({
    message: "Não.",
    messageId: "no",
    contextVersion: 7,
    lastRelevantQuestion: question,
  });
  assert.equal(no.answeredQuestionKey, "device_model");
  assert.deepEqual(no.factsExtracted, []);

  const store = new InMemoryConversationStateStore();
  const orchestrator = new RuntimeV2ShadowOrchestrator(
    store,
    environment,
    () => new Date("2026-07-13T15:00:00.000Z"),
  );
  await orchestrator.process(snapshot("old-session", "Seu equipamento é um Acer Nitro 5?"));
  const resetScope = {
    ...scope,
    contextVersion: 8,
    conversationId: "authority-conversation-reset",
  };
  const resetOrchestrator = new RuntimeV2ShadowOrchestrator(store, {
    ...environment,
    RUNTIME_V2_SHADOW_CONVERSATION_IDS: `${scope.conversationId},${resetScope.conversationId}`,
  });
  const resetResult = await resetOrchestrator.process({
    ...snapshot("new-session", "Sim, isso mesmo."),
    scope: resetScope,
  });
  assert.equal(resetResult.manifest.lastRelevantQuestionKey, null);
  assert.equal(resetResult.manifest.turnIntent, "ambiguous_confirmation");
});

test("extração registra upgrade, acessórios, capacidades e agenda sem confundir valores com preço", () => {
  const turn = understandTurn({
    message:
      "Quero fazer um upgrade, pôr mais SSD, memória RAM, um kit gamer, mouse, teclado e fone.",
    messageId: "upgrade",
    contextVersion: 7,
  });
  const keys = turn.factsExtracted.map((item) => item.key);
  assert.equal(turn.objective?.key, "device_upgrade");
  assert.deepEqual(
    keys.filter((key) => key.startsWith("requested_accessory_")),
    [
      "requested_accessory_mouse",
      "requested_accessory_keyboard",
      "requested_accessory_headset",
      "requested_accessory_gaming_kit",
    ],
  );

  const capacities = understandTurn({
    message: "Um SSD de 500 mais uns 16 GB de RAM.",
    messageId: "capacities",
    contextVersion: 7,
  });
  assert.equal(
    capacities.factsExtracted.find((item) => item.key === "requested_ssd_capacity_gb").value,
    500,
  );
  assert.equal(
    capacities.factsExtracted.find((item) => item.key === "requested_ram_capacity_gb").value,
    16,
  );
  assert.equal(capacities.requestedInformationCategories.includes("price"), false);

  const withExistingDevice = understandTurn({
    message: "Quero colocar SSD, memória, mouse, teclado e fone.",
    messageId: "upgrade-existing-device",
    contextVersion: 7,
    existingObjective: {
      key: "device_service",
      subject: "Acer Nitro 5",
      evidenceMessageIds: ["device"],
    },
  });
  assert.equal(withExistingDevice.objective?.key, "device_upgrade");
  assert.equal(withExistingDevice.objective?.subject, "Acer Nitro 5");
  assert.equal(withExistingDevice.objectiveAction, "REPLACE");
});

test("disponibilidade, domingo, horário e exceção geram categorias estruturadas", () => {
  const immediate = understandTurn({ message: "Para agora", messageId: "now", contextVersion: 7 });
  assert.equal(immediate.turnIntent, "ask_availability");
  assert.ok(immediate.requestedInformationCategories.includes("availability"));

  const sunday = understandTurn({
    message: "Ou melhor, domingo",
    messageId: "day",
    contextVersion: 7,
  });
  assert.equal(sunday.turnIntent, "request_booking_date");
  assert.ok(sunday.requestedInformationCategories.includes("businessHours"));
  assert.ok(sunday.requestedInformationCategories.includes("availability"));

  const time = understandTurn({ message: "Às 13", messageId: "time", contextVersion: 7 });
  assert.equal(time.factsExtracted.find((item) => item.key === "requested_time").value, "13:00");
  assert.ok(time.requestedInformationCategories.includes("booking"));

  const exception = understandTurn({
    message: "Saio do serviço às 12:30. Não consegue esperar um pouco?",
    messageId: "exception",
    contextVersion: 7,
  });
  assert.equal(exception.turnIntent, "exception_request");
  assert.ok(exception.factsExtracted.some((item) => item.key === "exception_request"));
  assert.ok(exception.requestedInformationCategories.includes("exceptionRequest"));
});

test("guardião bloqueia preço, pickup e disponibilidade sem fonte e vence conflito de domingo", () => {
  const context = officialContext();
  const price = validateV1AnswerAuthority({
    answer: "O valor é R$ 300.",
    currentMessage: "Qual o preço?",
    sources: [],
    officialBusinessContext: context,
  });
  assert.deepEqual(price.blockedCategories, ["price"]);
  assert.match(price.answer, /valor confirmado/i);

  const sunday = validateV1AnswerAuthority({
    answer: "Domingo abrimos das 07:30 às 12:00.",
    currentMessage: "Vocês abrem domingo?",
    sources: [],
    officialBusinessContext: context,
    flowText: "Informações da Empresa: aos domingos atendemos das 07:30 às 12:00",
  });
  assert.deepEqual(sunday.authorityConflictCategories, ["businessHours"]);
  assert.deepEqual(sunday.rejectedSourceTypes, ["FLOW"]);
  assert.equal(sunday.answer, "Não, aos domingos estamos fechados.");
  assert.deepEqual(sunday.blockedCategories, []);
  assert.equal(sunday.replacementReason, "official_business_hours_deterministic_override");

  const availability = validateV1AnswerAuthority({
    answer: "Temos horário amanhã e posso agendar.",
    currentMessage: "Tem horário amanhã?",
    sources: [],
    officialBusinessContext: context,
  });
  assert.ok(availability.blockedCategories.includes("availability"));
});

test("guardião deriva alegações de domingo e OPEN_NOW exclusivamente da agenda oficial de cada empresa", () => {
  const companyA = officialContextForCompany({
    companyName: "Empresa A",
    weeklySchedule: {
      monday: [{ start: "09:00", end: "17:00" }],
      sunday: [],
    },
    now: new Date("2026-07-20T15:00:00.000Z"),
  });
  const companyB = officialContextForCompany({
    companyName: "Empresa B",
    weeklySchedule: {
      monday: [{ start: "09:00", end: "17:00" }],
      sunday: [{ start: "08:00", end: "12:00" }],
    },
    now: new Date("2026-07-20T15:00:00.000Z"),
  });
  const companyC = officialContextForCompany({
    companyName: "Empresa C",
    weeklySchedule: {
      monday: [{ start: "10:00", end: "14:00" }],
      sunday: [{ start: "10:00", end: "14:00" }],
    },
    now: new Date("2026-07-20T15:00:00.000Z"),
  });

  const correctClosedSunday = validateV1AnswerAuthority({
    answer: "Não, aos domingos estamos fechados.",
    currentMessage: "Vocês abrem domingo?",
    sources: [],
    officialBusinessContext: companyA,
  });
  const wrongClosedSunday = validateV1AnswerAuthority({
    answer: "Sim, aos domingos atendemos das 10h às 14h.",
    currentMessage: "Vocês abrem domingo?",
    sources: [],
    officialBusinessContext: companyA,
    flowText: "Aos domingos atendemos das 10h às 14h.",
  });
  const correctOpenSundayB = validateV1AnswerAuthority({
    answer: "Sim, aos domingos atendemos das 08h às 12h.",
    currentMessage: "Vocês abrem domingo?",
    sources: [],
    officialBusinessContext: companyB,
  });
  const correctOpenSundayC = validateV1AnswerAuthority({
    answer: "Sim, aos domingos atendemos das 10h às 14h.",
    currentMessage: "Vocês abrem domingo?",
    sources: [],
    officialBusinessContext: companyC,
  });

  const openNowContext = officialContextForCompany({
    companyName: "Empresa C",
    weeklySchedule: {
      monday: [{ start: "10:00", end: "14:00" }],
      sunday: [{ start: "10:00", end: "14:00" }],
    },
    now: new Date("2026-07-20T15:00:00.000Z"),
  });
  const correctOpenNow = validateV1AnswerAuthority({
    answer: "Sim, estamos abertos agora. Hoje atendemos das 10:00 às 14:00.",
    currentMessage: "Vocês estão abertos agora?",
    sources: [],
    officialBusinessContext: openNowContext,
  });
  const wrongOpenNow = validateV1AnswerAuthority({
    answer: "Sim, estamos abertos agora. Hoje atendemos das 08:00 às 12:00.",
    currentMessage: "Vocês estão abertos agora?",
    sources: [],
    officialBusinessContext: openNowContext,
  });

  assert.equal(correctClosedSunday.replacementReason, null);
  assert.equal(correctClosedSunday.answer, "Não, aos domingos estamos fechados.");
  assert.equal(wrongClosedSunday.replacementReason, "official_business_hours_deterministic_override");
  assert.equal(wrongClosedSunday.answer, "Não, aos domingos estamos fechados.");
  assert.equal(correctOpenSundayB.replacementReason, null);
  assert.equal(correctOpenSundayB.answer, "Sim, aos domingos atendemos das 08h às 12h.");
  assert.equal(correctOpenSundayC.replacementReason, null);
  assert.equal(correctOpenSundayC.answer, "Sim, aos domingos atendemos das 10h às 14h.");
  assert.equal(correctOpenNow.replacementReason, null);
  assert.equal(correctOpenNow.answer, "Sim, estamos abertos agora. Hoje atendemos das 10:00 às 14:00.");
  assert.equal(wrongOpenNow.replacementReason, "official_business_hours_deterministic_override");
  assert.match(wrongOpenNow.answer, /10:00 às 14:00/i);
  assert.doesNotMatch(wrongOpenNow.answer, /08:00 às 12:00/i);
});

test("guardião V1 restaura a agenda oficial para domingo fechado e OPEN_NOW", () => {
  const sundayContext = officialContext();
  const openNowContext = buildOfficialBusinessContext(
    {
      companyName: "Empresa de teste",
      companyTimezone: "America/Campo_Grande",
      weeklySchedule: {
        monday: [{ start: "08:00", end: "22:00" }],
        sunday: [],
      },
    },
    new Date("2026-07-20T17:00:00.000Z"),
  );
  const sunday = validateV1AnswerAuthority({
    answer: "Esse horário está fora do funcionamento oficial informado.",
    currentMessage: "Vocês abrem aos domingos?",
    sources: [],
    officialBusinessContext: sundayContext,
  });
  const openNow = validateV1AnswerAuthority({
    answer:
      "Sim, estamos abertos! O horário de atendimento é de segunda a sexta, das 08:00 às 18:00.",
    currentMessage: "Vocês estão abertos agora?",
    sources: [],
    officialBusinessContext: openNowContext,
  });

  assert.equal(sunday.answer, "Não, aos domingos estamos fechados.");
  assert.equal(sunday.replacementReason, "official_business_hours_deterministic_override");
  assert.match(openNow.answer, /estamos abertos agora/i);
  assert.match(openNow.answer, /08:00 às 22:00/i);
  assert.doesNotMatch(openNow.answer, /08:00 às 18:00/i);
  assert.equal(openNow.replacementReason, "official_business_hours_deterministic_override");
});

test("override V1 de horário só corrige contradição com agenda oficial válida e intenção exclusiva", () => {
  const openNowContext = buildOfficialBusinessContext(
    {
      companyName: "Empresa de teste",
      companyTimezone: "America/Campo_Grande",
      weeklySchedule: {
        monday: [{ start: "08:00", end: "22:00" }],
        sunday: [],
      },
    },
    new Date("2026-07-20T17:00:00.000Z"),
  );
  const noScheduleContext = buildOfficialBusinessContext(
    {
      companyName: "Empresa sem agenda",
      companyTimezone: "America/Campo_Grande",
      weeklySchedule: {},
    },
    new Date("2026-07-20T17:00:00.000Z"),
  );
  const invalidScheduleContext = buildOfficialBusinessContext(
    {
      companyName: "Empresa com agenda inválida",
      companyTimezone: "America/Campo_Grande",
      weeklySchedule: { monday: [{ start: "22:00", end: "08:00" }] },
    },
    new Date("2026-07-20T17:00:00.000Z"),
  );
  const correctOpenNow =
    "Sim, estamos abertos agora. Hoje atendemos das 08:00 às 22:00 e não fechamos para almoço.";
  const wrongOpenNow =
    "Sim, estamos abertos! O horário de atendimento é de segunda a sexta, das 08:00 às 18:00.";

  const correctOpen = validateV1AnswerAuthority({
    answer: correctOpenNow,
    currentMessage: "Vocês estão abertos agora?",
    sources: [],
    officialBusinessContext: openNowContext,
  });
  const wrongOpen = validateV1AnswerAuthority({
    answer: wrongOpenNow,
    currentMessage: "Vocês estão abertos agora?",
    sources: [],
    officialBusinessContext: openNowContext,
  });
  const missingSchedule = validateV1AnswerAuthority({
    answer: "Esse horário está fora do funcionamento oficial informado.",
    currentMessage: "Vocês estão abertos agora?",
    sources: [],
    officialBusinessContext: noScheduleContext,
  });
  const invalidSchedule = validateV1AnswerAuthority({
    answer: "Esse horário está fora do funcionamento oficial informado.",
    currentMessage: "Vocês estão abertos agora?",
    sources: [],
    officialBusinessContext: invalidScheduleContext,
  });
  const humanHandoff = validateV1AnswerAuthority({
    answer: "Vou encaminhar você para um atendente humano; estamos abertos agora.",
    currentMessage: "Quero falar com um humano; vocês estão abertos agora?",
    sources: [],
    officialBusinessContext: openNowContext,
  });
  const complaint = validateV1AnswerAuthority({
    answer: "Vou registrar sua reclamação para a equipe.",
    currentMessage: "Quero reclamar; vocês estão abertos agora?",
    sources: [],
    officialBusinessContext: openNowContext,
  });
  const nonHoursAnswer = validateV1AnswerAuthority({
    answer: "Vou verificar essa informação com a equipe.",
    currentMessage: "Vocês estão abertos agora?",
    sources: [],
    officialBusinessContext: openNowContext,
  });
  const invalidTimezone = validateV1AnswerAuthority({
    answer: "Esse horário está fora do funcionamento oficial informado.",
    currentMessage: "Vocês estão abertos agora?",
    sources: [],
    officialBusinessContext: { ...openNowContext, timezone: "Invalid/Timezone" },
  });
  const wrongSunday = validateV1AnswerAuthority({
    answer: "Esse horário está fora do funcionamento oficial informado.",
    currentMessage: "Vocês abrem aos domingos?",
    sources: [],
    officialBusinessContext: openNowContext,
  });
  const correctSunday = validateV1AnswerAuthority({
    answer: "Não, aos domingos estamos fechados.",
    currentMessage: "Vocês abrem aos domingos?",
    sources: [],
    officialBusinessContext: openNowContext,
  });
  const weekly = validateV1AnswerAuthority({
    answer: "Atendemos de segunda a sexta, das 08h às 22h; aos domingos estamos fechados.",
    currentMessage: "Qual é o horário de funcionamento?",
    sources: [],
    officialBusinessContext: openNowContext,
  });

  assert.equal(correctOpen.answer, correctOpenNow);
  assert.equal(correctOpen.replacementReason, null);
  assert.match(wrongOpen.answer, /08:00 às 22:00/i);
  assert.equal(wrongOpen.replacementReason, "official_business_hours_deterministic_override");
  assert.equal(
    missingSchedule.answer,
    "Esse horário está fora do funcionamento oficial informado.",
  );
  assert.equal(missingSchedule.replacementReason, null);
  assert.equal(
    invalidSchedule.answer,
    "Esse horário está fora do funcionamento oficial informado.",
  );
  assert.equal(invalidSchedule.replacementReason, null);
  assert.equal(
    humanHandoff.answer,
    "Vou encaminhar você para um atendente humano; estamos abertos agora.",
  );
  assert.equal(humanHandoff.replacementReason, null);
  assert.equal(complaint.answer, "Vou registrar sua reclamação para a equipe.");
  assert.equal(complaint.replacementReason, null);
  assert.equal(nonHoursAnswer.answer, "Vou verificar essa informação com a equipe.");
  assert.equal(nonHoursAnswer.replacementReason, null);
  assert.equal(
    invalidTimezone.answer,
    "Esse horário está fora do funcionamento oficial informado.",
  );
  assert.equal(invalidTimezone.replacementReason, null);
  assert.equal(wrongSunday.answer, "Não, aos domingos estamos fechados.");
  assert.equal(wrongSunday.replacementReason, "official_business_hours_deterministic_override");
  assert.equal(correctSunday.answer, "Não, aos domingos estamos fechados.");
  assert.equal(correctSunday.replacementReason, null);
  assert.equal(
    weekly.answer,
    "Atendemos de segunda a sexta, das 08h às 22h; aos domingos estamos fechados.",
  );
  assert.equal(weekly.replacementReason, null);
});

test("guardião usa a intenção atual para escolher a resposta segura", () => {
  const result = validateV1AnswerAuthority({
    answer: "Temos disponibilidade e posso agendar esse atendimento.",
    currentMessage: "Qual o preço para formatar o Mac?",
    normalizedIntent: "ask_price",
    selectedFlowId: "configured-price-flow",
    selectedFlowKey: "pricing",
    sources: [],
    officialBusinessContext: officialContext(),
  });
  assert.deepEqual(result.blockedCategories, ["availability"]);
  assert.equal(result.generatedClaimCategory, "availability");
  assert.equal(result.finalSafeResponseCategory, "price");
  assert.match(result.answer, /valor confirmado/i);
});

test("lote multiassunto não converte uma resposta segura de coleta em indisponibilidade de horário", () => {
  const result = validateV1AnswerAuthority({
    answer: "Preciso confirmar se existe disponibilidade para a retirada desse atendimento.",
    currentMessage:
      "Meu notebook nao ta ligando\nVoces fazem coleta?\nE qual horário ode atendimento ai?",
    selectedFlowKey: "coleta",
    sources: [],
    officialBusinessContext: officialContext(),
  });

  assert.equal(result.finalSafeResponseCategory, null);
  assert.equal(result.authorityCategorySource, "explicit_intent");
  assert.match(result.answer, /retirada/i);
  assert.doesNotMatch(result.answer, /fora do funcionamento oficial/i);
});

test("guardião preserva reconhecimento secundário quando coleta ainda exige confirmação", () => {
  const result = validateV1AnswerAuthority({
    answer:
      "Entendi que seu notebook não está ligando. Preciso confirmar se a retirada está disponível para esse atendimento.",
    currentMessage: "Meu notebook não está ligando\nVocês fazem coleta?",
    selectedFlowKey: "pickup_delivery",
    sources: [],
    officialBusinessContext: officialContext(),
  });

  assert.equal(result.replacementReason, null);
  assert.match(result.answer, /notebook não está ligando/i);
  assert.match(result.answer, /retirada/i);
});

test("composição final restaura cobertura determinística depois de substituição segura do guardião", () => {
  const message = "Meu notebook não está ligando\nVocês fazem coleta?";
  const guarded = validateV1AnswerAuthority({
    answer: "A coleta está disponível para esse atendimento.",
    currentMessage: message,
    selectedFlowKey: "pickup_delivery",
    sources: [],
    officialBusinessContext: officialContext(),
  });
  const coverage = ensureMultiIntentResponseCoverage({
    answer: guarded.answer,
    turn: buildMultiIntentTurn({ message, selectedIntentKey: "pickup_delivery" }),
    currentMessage: message,
    officialBusinessContext: officialContext(),
  });

  assert.match(guarded.answer, /confirmar/i);
  assert.match(coverage.answer, /notebook não está ligando/i);
  assert.match(coverage.answer, /retirada|coleta/i);
  assert.equal(coverage.coverage.deterministicAcknowledgementApplied, true);
  assert.deepEqual(coverage.coverage.unresolvedRequests, ["technical_support"]);
});

test("proteção factual diferencia especificações do cliente de afirmações comerciais", () => {
  const context = officialContext();
  const customerSpecs = validateV1AnswerAuthority({
    answer: "Você solicitou SSD de 500 GB e 16 GB de RAM.",
    currentMessage: "SSD de 500 GB e 16 GB de RAM",
    sources: [],
    officialBusinessContext: context,
  });
  assert.equal(customerSpecs.unsupportedClaimDetected, false);

  const historicalPayment = validateV1AnswerAuthority({
    answer: "Você mencionou que pagou R$ 300 antes.",
    currentMessage: "Paguei R$ 300 antes.",
    sources: [],
    officialBusinessContext: context,
  });
  assert.equal(historicalPayment.unsupportedClaimDetected, false);

  const currentPrice = validateV1AnswerAuthority({
    answer: "O valor atual é R$ 300, conforme você informou antes.",
    currentMessage: "Qual é o preço atual?",
    sources: [],
    officialBusinessContext: context,
  });
  assert.deepEqual(currentPrice.blockedCategories, ["price"]);
});

test("fontes oficiais permitem a categoria correta e histórico antigo não autoriza comércio", () => {
  const context = officialContext();
  const officialPrice = validateV1AnswerAuthority({
    answer: "O valor é R$ 300.",
    currentMessage: "Qual o preço?",
    sources: [{ id: "price-official", title: "Preço oficial" }],
    officialBusinessContext: context,
  });
  assert.equal(officialPrice.unsupportedClaimDetected, false);

  const oldHistory = validateV1AnswerAuthority({
    answer: "O valor é R$ 300.",
    currentMessage: "Qual o preço?",
    sources: [{ id: "history-old", title: "Histórico antigo da conversa" }],
    officialBusinessContext: context,
  });
  assert.deepEqual(oldHistory.blockedCategories, ["price"]);

  const officialAddress = validateV1AnswerAuthority({
    answer: "O endereço oficial está cadastrado no contexto da empresa.",
    currentMessage: "Qual é o endereço?",
    sources: [{ id: "official-structured-data", title: "Contexto oficial estruturado" }],
    officialBusinessContext: context,
  });
  assert.equal(officialAddress.unsupportedClaimDetected, false);
});

test("horário comercial não é confundido com vaga ou agendamento", () => {
  const context = officialContext();
  const openMonday = validateV1AnswerAuthority({
    answer: "Na segunda-feira a empresa funciona das 08:00 às 18:00.",
    currentMessage: "Vocês abrem segunda-feira?",
    sources: [{ id: "official-structured-data", title: "Horário oficial" }],
    officialBusinessContext: context,
  });
  assert.equal(openMonday.unsupportedClaimDetected, false);

  const noAvailability = validateV1AnswerAuthority({
    answer: "A empresa funciona na segunda, mas não posso confirmar uma vaga.",
    currentMessage: "Tem vaga segunda?",
    sources: [{ id: "official-structured-data", title: "Horário oficial" }],
    officialBusinessContext: context,
  });
  assert.equal(noAvailability.unsupportedClaimDetected, false);

  const pickupPolicy = validateV1AnswerAuthority({
    answer: "Realizamos retirada conforme a política de atendimento.",
    currentMessage: "Vocês buscam?",
    sources: [{ id: "pickup-policy", title: "Política oficial de retirada" }],
    officialBusinessContext: context,
  });
  assert.equal(pickupPolicy.unsupportedClaimDetected, false);
});

test("saída explícita da triagem vence a categoria inventada pelo provider", () => {
  const result = validateV1AnswerAuthority({
    answer: "Preciso confirmar a disponibilidade antes de indicar um horário.",
    currentMessage: "Não entendo SATA ou NVMe. Vocês podem verificar?",
    sources: [],
    officialBusinessContext: officialContext(),
    conversationalOutcome: "technical_evaluation",
    triageExitReason: "CUSTOMER_REQUESTS_TECHNICAL_EVALUATION",
    customerUnableToAnswer: true,
  });

  assert.equal(result.finalSafeResponseCategory, "technical_evaluation");
  assert.equal(result.authorityCategorySource, "triage_outcome");
  assert.equal(result.triageResponseProtected, true);
  assert.equal(result.replacementReason, "explicit_triage_outcome_precedence");
  assert.match(result.answer, /avaliação|avaliacao/i);
  assert.doesNotMatch(result.answer, /disponibilidade|horário|horario/i);
});

test("domingo fechado não sobrescreve uma resposta de booking", () => {
  const result = validateV1AnswerAuthority({
    answer: "Posso verificar a disponibilidade para domingo às 13h.",
    currentMessage: "Domingo às 13h posso levar?",
    sources: [],
    officialBusinessContext: officialContext(),
    normalizedIntent: "request_booking_date",
  });

  assert.equal(result.finalSafeResponseCategory, null);
  assert.equal(result.authorityCategorySource, "official_context");
  assert.equal(result.replacementReason, null);
  assert.equal(result.answer, "Posso verificar a disponibilidade para domingo às 13h.");
});

test("contato oficial ausente não é inventado e contato estruturado é permitido", () => {
  const absent = validateV1AnswerAuthority({
    answer: "O telefone da empresa é 67999999999.",
    currentMessage: "Qual é o telefone da assistência?",
    sources: [],
    officialBusinessContext: officialContext(),
    expectedAuthorityCategory: "official_contact",
    officialContactAvailable: false,
  });
  assert.equal(absent.finalSafeResponseCategory, "official_contact");
  assert.match(absent.answer, /contato oficial não está disponível/i);

  const present = validateV1AnswerAuthority({
    answer: "O telefone oficial está disponível no cadastro da empresa.",
    currentMessage: "Qual é o telefone da assistência?",
    sources: [{ id: "official-structured-data", title: "Contato oficial" }],
    officialBusinessContext: officialContext(),
    expectedAuthorityCategory: "official_contact",
    officialContactAvailable: true,
  });
  assert.equal(present.unsupportedClaimDetected, false);
});
