import assert from "node:assert/strict";
import test from "node:test";

import {
  buildOfficialBusinessContext,
  buildDeterministicBusinessHoursResponse,
  buildStructuredBusinessAnswer,
} from "../dist/assistants/official-business-context.js";

const fgSchedule = {
  monday: [{ start: "08:00", end: "18:00" }],
  tuesday: [{ start: "08:00", end: "18:00" }],
  wednesday: [{ start: "08:00", end: "18:00" }],
  thursday: [{ start: "08:00", end: "18:00" }],
  friday: [{ start: "08:00", end: "18:00" }],
  saturday: [{ start: "07:30", end: "12:00" }],
  sunday: [],
};

function buildFgContext(now) {
  return buildOfficialBusinessContext(
    {
      companyName: "FG Informática",
      assistantName: "FG Assistente",
      companyTimezone: "America/Sao_Paulo",
      assistantTimezone: "America/Campo_Grande",
      description: "Loja de informática em Dourados/MS.",
      businessAddress: "Rua Exemplo, 123",
      businessCity: "Dourados",
      businessState: "MS",
      businessPostalCode: "79800-000",
      businessPhone: "(67) 3422-0000",
      businessWhatsapp: "(67) 99999-9999",
      websiteUrl: "https://fginformatica.com.br",
      weeklySchedule: fgSchedule,
      aiAlwaysAvailable: true,
    },
    now,
  );
}

test("FG sexta-feira 07:09 em America/Campo_Grande responde que ainda está fechada", () => {
  const context = buildFgContext(new Date("2026-07-10T11:09:00.000Z"));
  const answer = buildStructuredBusinessAnswer("Vocês estão abertos agora?", context);

  assert.ok(answer);
  assert.match(answer.answer, /ainda estamos fechados/i);
  assert.match(answer.answer, /08:00/);
  assert.match(answer.answer, /Dourados\/MS/);
});

test("FG sexta-feira 08:30 em America/Campo_Grande responde que está aberta", () => {
  const context = buildFgContext(new Date("2026-07-10T12:30:00.000Z"));
  const answer = buildStructuredBusinessAnswer("Vocês estão abertos agora?", context);

  assert.ok(answer);
  assert.match(answer.answer, /estamos abertos agora/i);
  assert.match(answer.answer, /08:00 às 18:00/i);
  assert.match(answer.answer, /não fechamos para almoço/i);
});

test("formatter determinístico responde sábado, domingo, hoje e aberto agora no timezone oficial", () => {
  const saturdayContext = buildFgContext(new Date("2026-07-11T15:00:00.000Z"));
  const saturday = buildDeterministicBusinessHoursResponse("Vocês abrem sábado?", saturdayContext);
  assert.equal(saturday.requestedScheduleScope, "specific_day");
  assert.equal(saturday.requestedDay, "saturday");
  assert.match(saturday.answer, /^Sim\./);
  assert.match(saturday.answer, /07h30 às 12h/i);

  const sundayContext = buildFgContext(new Date("2026-07-12T15:00:00.000Z"));
  const sunday = buildDeterministicBusinessHoursResponse("Vocês abrem domingo?", sundayContext);
  assert.equal(sunday.requestedScheduleScope, "specific_day");
  assert.equal(sunday.requestedDay, "sunday");
  assert.equal(sunday.deterministicBranch, "SPECIFIC_DAY");
  assert.equal(sunday.answer, "Não, aos domingos estamos fechados.");

  const today = buildDeterministicBusinessHoursResponse("Qual o horário de hoje?", saturdayContext);
  assert.equal(today.requestedScheduleScope, "today");
  assert.match(today.answer, /sábado/i);
  assert.match(today.answer, /07h30 às 12h/i);

  const openNow = buildDeterministicBusinessHoursResponse(
    "Vocês estão abertos agora?",
    saturdayContext,
  );
  assert.equal(openNow.requestedScheduleScope, "open_now");
  assert.equal(openNow.timezone, "America/Campo_Grande");
  assert.match(openNow.answer, /abertos agora/i);
});

test("variantes explícitas de sábado preservam SPECIFIC_DAY e o sábado oficial", () => {
  const context = buildFgContext(new Date("2026-07-20T23:00:00.000Z"));
  const variants = [
    "sábado",
    "sabado",
    "E sábado?",
    "e sábado",
    "E no sábado?",
    "Vocês abrem sábado?",
  ];

  for (const question of variants) {
    const answer = buildDeterministicBusinessHoursResponse(question, context);
    assert.equal(answer.requestedScheduleScope, "specific_day");
    assert.equal(answer.requestedDay, "saturday");
    assert.equal(answer.deterministicBranch, "SPECIFIC_DAY");
    assert.equal(answer.isOpenNow, null);
    assert.match(answer.answer, /^Sim\./);
    assert.match(answer.answer, /07h30 às 12h/i);
  }

  const typo = buildDeterministicBusinessHoursResponse("E sabido?", context);
  assert.equal(typo.requestedScheduleScope, "weekly");
  assert.equal(typo.requestedDay, null);
});

test("resumo semanal tem precedência sobre estado atual em qualquer dia ou horário", () => {
  const weeklyQuestions = [
    "Qual o horário de funcionamento?",
    "Quais os horários?",
    "Que horas vocês funcionam?",
    "Qual o horário durante a semana?",
    "Me passa o horário de atendimento",
    "Qual o expediente?",
  ];
  const referenceInstants = [
    new Date("2026-07-20T17:00:00.000Z"), // segunda, 13:00 local: aberto
    new Date("2026-07-20T23:00:00.000Z"), // segunda, 19:00 local: fechado
    new Date("2026-07-11T17:00:00.000Z"), // sábado, 13:00 local: fechado
    new Date("2026-07-12T15:00:00.000Z"), // domingo, 11:00 local: fechado
  ];

  for (const now of referenceInstants) {
    for (const question of weeklyQuestions) {
      const answer = buildDeterministicBusinessHoursResponse(question, buildFgContext(now));
      assert.equal(answer.requestedScheduleScope, "weekly");
      assert.equal(answer.deterministicBranch, "WEEKLY_SUMMARY");
      assert.equal(answer.isOpenNow, null);
      assert.equal(answer.timezone, "America/Campo_Grande");
      assert.equal(answer.normalizedScheduleDayCount, 6);
      assert.equal(answer.normalizedScheduleIntervalCount, 6);
      assert.match(answer.answer, /segunda a sexta/i);
      assert.match(answer.answer, /sábado/i);
      assert.match(answer.answer, /domingo/i);
      assert.doesNotMatch(answer.answer, /fora do funcionamento oficial/i);
    }
  }
});

test("formatter separa dia específico, hoje e estado atual do resumo semanal", () => {
  const openContext = buildFgContext(new Date("2026-07-20T17:00:00.000Z"));
  const closedContext = buildFgContext(new Date("2026-07-20T23:00:00.000Z"));
  const saturdayClosedContext = buildOfficialBusinessContext(
    {
      companyName: "Empresa teste",
      assistantTimezone: "America/Campo_Grande",
      weeklySchedule: { ...fgSchedule, saturday: [] },
    },
    new Date("2026-07-11T15:00:00.000Z"),
  );
  const sundayOpenContext = buildOfficialBusinessContext(
    {
      companyName: "Empresa teste",
      assistantTimezone: "America/Campo_Grande",
      weeklySchedule: { ...fgSchedule, sunday: [{ start: "09:00", end: "12:00" }] },
    },
    new Date("2026-07-12T15:00:00.000Z"),
  );

  const saturdayClosed = buildDeterministicBusinessHoursResponse(
    "Vocês abrem sábado?",
    saturdayClosedContext,
  );
  const sundayOpen = buildDeterministicBusinessHoursResponse(
    "Vocês abrem domingo?",
    sundayOpenContext,
  );
  const today = buildDeterministicBusinessHoursResponse("Qual o horário de hoje?", openContext);
  const openNow = buildDeterministicBusinessHoursResponse(
    "Vocês estão abertos agora?",
    openContext,
  );
  const closedNow = buildDeterministicBusinessHoursResponse(
    "Vocês estão abertos agora?",
    closedContext,
  );

  assert.equal(saturdayClosed.deterministicBranch, "SPECIFIC_DAY");
  assert.equal(saturdayClosed.answer, "Não, aos sábados estamos fechados.");
  assert.equal(sundayOpen.deterministicBranch, "SPECIFIC_DAY");
  assert.match(sundayOpen.answer, /^Sim\./);
  assert.equal(today.deterministicBranch, "TODAY");
  assert.equal(openNow.deterministicBranch, "OPEN_NOW");
  assert.equal(openNow.isOpenNow, true);
  assert.equal(closedNow.deterministicBranch, "CLOSED_NOW");
  assert.equal(closedNow.isOpenNow, false);
});

test("agenda ausente, vazia ou inválida usa somente o fallback seguro determinístico", () => {
  const contexts = [
    [null, 0],
    [buildOfficialBusinessContext({ companyName: "Sem agenda", weeklySchedule: {} }), 0],
    [
      buildOfficialBusinessContext({
        companyName: "Agenda inválida",
        weeklySchedule: { monday: [{ start: "99:00", end: "18:00" }] },
      }),
      1,
    ],
  ];

  for (const [context, expectedIssueCount] of contexts) {
    const answer = buildDeterministicBusinessHoursResponse(
      "Qual o horário de funcionamento?",
      context,
    );
    assert.equal(answer.deterministicBranch, "MISSING_SCHEDULE");
    assert.equal(answer.missingScheduleConfiguration, true);
    assert.equal(answer.scheduleValidationIssueCount, expectedIssueCount);
    if (expectedIssueCount === 0) {
      assert.equal(answer.normalizedScheduleDayCount, 0);
      assert.equal(answer.normalizedScheduleIntervalCount, 0);
    }
    assert.match(answer.answer, /não tenho o horário confirmado/i);
    assert.doesNotMatch(answer.answer, /fora do funcionamento oficial/i);
  }

  const invalid = buildDeterministicBusinessHoursResponse(
    "Qual o horário de funcionamento?",
    contexts[2][0],
  );
  assert.ok(invalid.scheduleValidationIssueCount > 0);
});

test("resumo semanal lista dias diferentes e múltiplos intervalos estruturados", () => {
  const context = buildOfficialBusinessContext({
    companyName: "Empresa teste",
    assistantTimezone: "America/Campo_Grande",
    weeklySchedule: {
      monday: [
        { start: "08:00", end: "12:00" },
        { start: "13:30", end: "18:00" },
      ],
      tuesday: [{ start: "09:00", end: "17:00" }],
      saturday: [{ start: "08:00", end: "12:00" }],
      sunday: [],
    },
  });
  const answer = buildDeterministicBusinessHoursResponse(
    "Qual o horário de funcionamento?",
    context,
  );

  assert.equal(answer.deterministicBranch, "WEEKLY_SUMMARY");
  assert.equal(answer.normalizedScheduleDayCount, 3);
  assert.equal(answer.normalizedScheduleIntervalCount, 4);
  assert.match(answer.answer, /segunda-feira, das 08h às 12h e das 13h30 às 18h/i);
  assert.match(answer.answer, /terça-feira, das 09h às 17h/i);
  assert.match(answer.answer, /sábado/i);
  assert.match(answer.answer, /domingo/i);
});

test("formatter determinístico não inventa horário quando a agenda está ausente", () => {
  const context = buildOfficialBusinessContext({
    companyName: "Empresa sem agenda",
    weeklySchedule: {},
  });
  const answer = buildDeterministicBusinessHoursResponse("Qual o horário de atendimento?", context);
  assert.equal(answer.missingScheduleConfiguration, true);
  assert.match(answer.answer, /não tenho o horário confirmado/i);
  assert.doesNotMatch(answer.answer, /08h|18h|07h30/i);
});

test("formatter determinístico lista todos os intervalos de um dia", () => {
  const context = buildOfficialBusinessContext({
    companyName: "Empresa com dois intervalos",
    assistantTimezone: "America/Campo_Grande",
    weeklySchedule: {
      saturday: [
        { start: "08:00", end: "12:00" },
        { start: "13:00", end: "18:00" },
      ],
    },
  });
  const answer = buildDeterministicBusinessHoursResponse("Qual o horário de sábado?", context);
  assert.match(answer.answer, /08h às 12h e das 13h às 18h/i);
});

test("pergunta de horário informa a agenda oficial mesmo fora do expediente local", () => {
  const context = buildFgContext(new Date("2026-07-20T22:00:00.000Z"));
  const answer = buildStructuredBusinessAnswer("Qual o horário de atendimento?", context);

  assert.ok(answer);
  assert.equal(context.businessStatus.timezone, "America/Campo_Grande");
  assert.equal(context.businessStatus.localTime, "18:00");
  assert.equal(context.businessStatus.isOpenNow, false);
  assert.match(answer.answer, /08h às 18h/i);
  assert.match(answer.answer, /07h30 às 12h/i);
  assert.match(answer.answer, /domingos estamos fechados/i);
  assert.doesNotMatch(answer.answer, /fora do funcionamento oficial/i);
});

test("FG sábado 11:00 em America/Campo_Grande responde que está aberta", () => {
  const context = buildFgContext(new Date("2026-07-11T15:00:00.000Z"));
  const answer = buildStructuredBusinessAnswer("Vocês estão abertos agora?", context);

  assert.ok(answer);
  assert.match(answer.answer, /estamos abertos agora/i);
});

test("FG sábado 13:00 em America/Campo_Grande responde que está fechada", () => {
  const context = buildFgContext(new Date("2026-07-11T17:00:00.000Z"));
  const answer = buildStructuredBusinessAnswer("Vocês estão abertos agora?", context);

  assert.ok(answer);
  assert.match(answer.answer, /estamos fechados/i);
});

test("FG domingo 10:00 em America/Campo_Grande responde que está fechada", () => {
  const context = buildFgContext(new Date("2026-07-12T14:00:00.000Z"));
  const answer = buildStructuredBusinessAnswer("Vocês estão abertos agora?", context);

  assert.ok(answer);
  assert.match(answer.answer, /estamos fechados/i);
});

test("empresa com almoço responde intervalo corretamente às 12:30", () => {
  const context = buildOfficialBusinessContext(
    {
      companyName: "Empresa com almoço",
      assistantTimezone: "America/Campo_Grande",
      businessCity: "Dourados",
      businessState: "MS",
      weeklySchedule: {
        monday: [
          { start: "08:00", end: "12:00" },
          { start: "13:30", end: "18:00" },
        ],
      },
      aiAlwaysAvailable: true,
    },
    new Date("2026-07-13T16:30:00.000Z"),
  );
  const answer = buildStructuredBusinessAnswer("Vocês estão abertos agora?", context);

  assert.ok(answer);
  assert.match(answer.answer, /intervalo de almoço/i);
  assert.match(answer.answer, /13:30/);
});

test("pergunta sobre almoço respeita intervalos estruturados", () => {
  const context = buildOfficialBusinessContext(
    {
      companyName: "Empresa com almoço",
      assistantTimezone: "America/Campo_Grande",
      weeklySchedule: {
        monday: [
          { start: "08:00", end: "12:00" },
          { start: "13:30", end: "18:00" },
        ],
      },
      aiAlwaysAvailable: true,
    },
    new Date("2026-07-13T14:00:00.000Z"),
  );
  const answer = buildStructuredBusinessAnswer("Vocês fecham para almoço?", context);

  assert.ok(answer);
  assert.match(answer.answer, /fechamos para almoço/i);
  assert.match(answer.answer, /12:00 às 13:30/i);
});

test("endereço, contato e site priorizam dados estruturados", () => {
  const context = buildFgContext(new Date("2026-07-10T12:30:00.000Z"));

  const addressAnswer = buildStructuredBusinessAnswer("Qual o endereço?", context);
  const contactAnswer = buildStructuredBusinessAnswer("Qual o telefone e WhatsApp?", context);
  const siteAnswer = buildStructuredBusinessAnswer("Tem site?", context);

  assert.ok(addressAnswer);
  assert.match(addressAnswer.answer, /Rua Exemplo, 123/);
  assert.match(addressAnswer.answer, /Dourados\/MS|Dourados, MS/);

  assert.ok(contactAnswer);
  assert.match(contactAnswer.answer, /\(67\) 3422-0000/);
  assert.match(contactAnswer.answer, /\(67\) 99999-9999/);

  assert.ok(siteAnswer);
  assert.match(siteAnswer.answer, /https:\/\/fginformatica\.com\.br/);
});

test("pergunta específica de telefone responde apenas o telefone da loja", () => {
  const context = buildFgContext(new Date("2026-07-10T12:30:00.000Z"));
  const answer = buildStructuredBusinessAnswer("Qual o telefone da loja?", context);

  assert.ok(answer);
  assert.equal(answer.answer, "O telefone da loja é (67) 3422-0000.");
});

test("pergunta específica do WhatsApp da assistência responde apenas o contato técnico", () => {
  const context = buildOfficialBusinessContext(
    {
      companyName: "FG Informática",
      assistantTimezone: "America/Campo_Grande",
      businessWhatsappSupport: "(67) 9938-7021",
      aiAlwaysAvailable: true,
    },
    new Date("2026-07-10T12:30:00.000Z"),
  );
  const answer = buildStructuredBusinessAnswer("Qual o WhatsApp da assistência?", context);

  assert.ok(answer);
  assert.equal(answer.answer, "O WhatsApp da assistência técnica é (67) 9938-7021.");
});

test("pergunta genérica de contatos pode listar telefone e WhatsApp técnico", () => {
  const context = buildOfficialBusinessContext(
    {
      companyName: "FG Informática",
      assistantTimezone: "America/Campo_Grande",
      businessPhone: "(67) 3411-7070",
      businessWhatsappSupport: "(67) 9938-7021",
      aiAlwaysAvailable: true,
    },
    new Date("2026-07-10T12:30:00.000Z"),
  );
  const answer = buildStructuredBusinessAnswer("Quais os contatos da FG?", context);

  assert.ok(answer);
  assert.equal(
    answer.answer,
    "Nossos contatos oficiais são: Telefone: (67) 3411-7070 WhatsApp da assistência técnica: (67) 9938-7021.",
  );
});

test("pergunta nominal sobre Douglas não é sobrescrita pelo contato oficial genérico", () => {
  const context = buildFgContext(new Date("2026-07-10T12:30:00.000Z"));
  const answer = buildStructuredBusinessAnswer("Qual o WhatsApp do Douglas?", context);

  assert.equal(answer, null);
});
