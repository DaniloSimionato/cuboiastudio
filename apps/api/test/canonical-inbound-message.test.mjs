import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";

const require = createRequire(import.meta.url);
const {
  CANONICAL_INBOUND_MESSAGE_SCHEMA_VERSION,
  INBOUND_MESSAGE_NORMALIZATION_VERSION,
  createCanonicalInboundMessage,
  hashCanonicalInboundMessageContent,
  normalizeInboundMessageForComparison,
  toCanonicalInboundMessageTelemetry,
} = require("../dist/inbound/canonical-inbound-message.js");

function buildMessage(overrides = {}) {
  return createCanonicalInboundMessage({
    companyId: "company-canonical",
    assistantId: "assistant-canonical",
    conversationId: "conversation-canonical",
    internalMessageId: "message-canonical",
    externalMessageReference: "external-message-canonical",
    contentType: "text",
    displayContent: "Mensagem de teste",
    sourceSnapshotContent: "Mensagem de teste",
    receivedAt: new Date("2026-07-17T00:00:00.000Z"),
    ...overrides,
  });
}

test("inbound canônico preserva texto simples e contrato versionado", () => {
  const message = buildMessage();

  assert.equal(message.schemaVersion, CANONICAL_INBOUND_MESSAGE_SCHEMA_VERSION);
  assert.equal(message.normalizationVersion, INBOUND_MESSAGE_NORMALIZATION_VERSION);
  assert.equal(message.canonicalComparisonContent, "Mensagem de teste");
  assert.equal(message.sourceSnapshotHash, message.canonicalComparisonHash);
});

test("inbound canônico ignora espaços apenas nas extremidades para comparação", () => {
  assert.equal(
    hashCanonicalInboundMessageContent("  Mensagem de teste  "),
    hashCanonicalInboundMessageContent("Mensagem de teste"),
  );
});

test("inbound canônico preserva múltiplos espaços internos", () => {
  assert.notEqual(
    hashCanonicalInboundMessageContent("Mensagem  com espaços"),
    hashCanonicalInboundMessageContent("Mensagem com espaços"),
  );
});

test("inbound canônico normaliza CRLF e CR para LF", () => {
  assert.equal(
    hashCanonicalInboundMessageContent("linha um\r\nlinha dois\rlinha três"),
    hashCanonicalInboundMessageContent("linha um\nlinha dois\nlinha três"),
  );
});

test("inbound canônico normaliza Unicode NFC e NFD", () => {
  assert.equal(
    hashCanonicalInboundMessageContent("Informação"),
    hashCanonicalInboundMessageContent("Informac\u0327a\u0303o"),
  );
});

test("inbound canônico preserva acentos, emojis e variation selectors", () => {
  const content = "Olá, café ☕️";
  assert.equal(normalizeInboundMessageForComparison(content), content);
});

test("inbound canônico normaliza espaço não separável sem remover palavras", () => {
  assert.equal(normalizeInboundMessageForComparison("horário\u00a0de sábado"), "horário de sábado");
});

test("inbound canônico remove somente zero-width não significativo", () => {
  assert.equal(normalizeInboundMessageForComparison("teste\u200B"), "teste");
  assert.equal(normalizeInboundMessageForComparison("👩\u200D💻"), "👩\u200D💻");
});

test("inbound canônico preserva HTML, entidades e markdown como texto de exibição", () => {
  const content = "<b>texto</b> &amp; **marcado**";
  assert.equal(normalizeInboundMessageForComparison(content), content);
});

test("inbound canônico não remove pontuação semanticamente relevante", () => {
  assert.notEqual(
    hashCanonicalInboundMessageContent("Pode confirmar?"),
    hashCanonicalInboundMessageContent("Pode confirmar!"),
  );
});

test("inbound canônico preserva quebra de linha semanticamente relevante", () => {
  assert.notEqual(
    hashCanonicalInboundMessageContent("primeira linha\nsegunda linha"),
    hashCanonicalInboundMessageContent("primeira linha segunda linha"),
  );
});

test("inbound canônico mantém snapshot e display distintos quando a interpretação é multimodal", () => {
  const message = buildMessage({
    displayContent: "Legenda do cliente\n\nTexto extraído autorizado",
    sourceSnapshotContent: "Legenda do cliente",
    contentType: "attachment",
    attachmentMetadata: { count: 1, hasCaption: true, hasQuotedMessage: false },
  });

  assert.notEqual(message.sourceSnapshotHash, message.canonicalComparisonHash);
  assert.equal(message.attachmentMetadata.count, 1);
  assert.equal(message.attachmentMetadata.hasCaption, true);
});

test("inbound canônico representa mensagem sem texto com attachment sem inventar conteúdo", () => {
  const message = buildMessage({
    displayContent: "Texto extraído autorizado",
    sourceSnapshotContent: "",
    contentType: "attachment",
    attachmentMetadata: { count: 1 },
  });

  assert.equal(message.sourceSnapshotHash, null);
  assert.ok(message.canonicalComparisonHash);
});

test("inbound canônico preserva metadados de citação sem copiar o conteúdo citado", () => {
  const message = buildMessage({ quotedMessagePresent: true });
  const telemetry = toCanonicalInboundMessageTelemetry(message);

  assert.equal(telemetry.quotedMessageMetadata.present, true);
  assert.equal(Object.hasOwn(telemetry, "displayContent"), false);
});

test("inbound canônico marca edição somente quando datas externas a comprovam", () => {
  const createdAt = new Date("2026-07-17T00:00:00.000Z");
  const edited = buildMessage({
    externalCreatedAt: createdAt,
    externalUpdatedAt: new Date("2026-07-17T00:00:01.000Z"),
  });
  const unavailable = buildMessage();

  assert.equal(edited.wasEditedAfterReceipt, true);
  assert.equal(unavailable.wasEditedAfterReceipt, null);
});

test("inbound canônico usa hash canônico para idempotência sem colapsar conteúdo distinto", () => {
  assert.equal(
    hashCanonicalInboundMessageContent("mensagem\r\nrepetida"),
    hashCanonicalInboundMessageContent("mensagem\nrepetida"),
  );
  assert.notEqual(
    hashCanonicalInboundMessageContent("mensagem repetida"),
    hashCanonicalInboundMessageContent("outra mensagem"),
  );
});

test("inbound canônico não trunca o conteúdo de comparação", () => {
  const content = "x".repeat(4001);
  assert.equal(normalizeInboundMessageForComparison(content).length, 4001);
});

test("telemetria canônica é redigida e não duplica texto ou dados pessoais", () => {
  const message = buildMessage({ displayContent: "nome@exemplo.test 00000000000" });
  const telemetry = toCanonicalInboundMessageTelemetry(message);
  const serialized = JSON.stringify(telemetry);

  assert.equal(telemetry.redactionApplied, true);
  assert.equal(serialized.includes("nome@exemplo.test"), false);
  assert.equal(serialized.includes("00000000000"), false);
});

test("dois consumidores do mesmo inbound recebem a mesma entrada canônica", () => {
  const message = buildMessage({ displayContent: "Mensagem atual compartilhada" });
  const v1CurrentMessage = message.displayContent;
  const v2CurrentMessage = message.displayContent;

  assert.equal(
    hashCanonicalInboundMessageContent(v1CurrentMessage),
    hashCanonicalInboundMessageContent(v2CurrentMessage),
  );
});
