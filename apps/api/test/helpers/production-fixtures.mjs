import { createCipheriv, randomBytes } from "node:crypto";

export const TEST_ENCRYPTION_KEY_HEX = "11".repeat(32);
export const TEST_WEBHOOK_SECRET = "block0-webhook-secret";
const TEST_CHATWOOT_TOKEN = "block0-chatwoot-token";
const TEST_PROVIDER_TOKEN = "block0-provider-token";

export const FIXTURE_LABELS = [
  "a",
  "b",
  "c",
  "d",
  "e",
  "f",
  "g",
  "h",
  "i",
  "j",
  "k",
  "l",
  "m",
  "n",
  "o",
  "p",
  "q",
  "r",
  "s",
  "t",
  "u",
  "v",
  "w",
  "x",
  "y",
  "z",
  "aa",
  "ab",
  "ac",
  "ad",
  "ae",
  "af",
  "ag",
  "ah",
  "ai",
  "aj",
  "ak",
  "al",
  "am",
  "an",
  "ao",
  "ap",
  "aq",
  "ar",
  "as",
  "at",
  "au",
  "av",
  "aw",
  "ax",
  "ay",
  "az",
  "ba",
  "bb",
  "bc",
  "bd",
  "be",
  "bf",
  "bg",
  "bh",
  "bi",
  "bj",
  "bk",
  "bl",
  "bm",
  "bn",
  "bo",
  "bp",
  "bq",
  "br",
  "bs",
  "bt",
  "bu",
  "bv",
  "bw",
  "bx",
  "by",
  "bz",
];

export const OFFICIAL_WEEKLY_SCHEDULE = Object.freeze({
  monday: [{ start: "08:00", end: "22:00" }],
  tuesday: [{ start: "08:00", end: "23:00" }],
  wednesday: [
    { start: "08:00", end: "11:00" },
    { start: "13:00", end: "21:00" },
  ],
  thursday: [{ start: "08:00", end: "18:00" }],
  friday: [{ start: "08:00", end: "18:00" }],
  saturday: [{ start: "07:30", end: "12:00" }],
  sunday: [],
});

export const FORMATTING_AUTHORITY_TEXT =
  "A formatação custa a partir de R$ 1.950,00.";

const MOTHERBOARD_CONTEXT_PREFIX =
  "Contexto técnico sem valor comercial confirmado neste trecho. ";
export const MOTHERBOARD_AUTHORITY_AFTER_250_TEXT =
  `${MOTHERBOARD_CONTEXT_PREFIX.repeat(4)}O reparo de placa-mãe custa a partir de R$ 395,00.`;
const MOTHERBOARD_PREFIX = MOTHERBOARD_CONTEXT_PREFIX.repeat(16);
export const MOTHERBOARD_AUTHORITY_TEXT =
  `${MOTHERBOARD_PREFIX}O reparo de placa-mãe custa a partir de R$ 395,00.`;

const motherboardAfter250Position =
  MOTHERBOARD_AUTHORITY_AFTER_250_TEXT.indexOf("R$ 395,00");
if (motherboardAfter250Position <= 250 || motherboardAfter250Position >= 800) {
  throw new Error(
    "Motherboard after-250 authority fixture must remain after character 250 and before 800",
  );
}
if (MOTHERBOARD_AUTHORITY_TEXT.indexOf("R$ 395,00") <= 800) {
  throw new Error("Motherboard authority fixture must remain beyond character 800");
}

function encryptTestSecret(value) {
  const key = Buffer.from(TEST_ENCRYPTION_KEY_HEX, "hex");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return {
    encryptedValue: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
  };
}

function fixtureIds(label) {
  if (!FIXTURE_LABELS.includes(label)) {
    throw new Error(`Unknown production HTTP fixture label: ${label}`);
  }
  return {
    companyId: `block0-${label}-company`,
    assistantId: `block0-${label}-assistant`,
    behaviorId: `block0-${label}-behavior`,
    flowId: `block0-${label}-technical-flow`,
    knowledgeId: `block0-${label}-knowledge`,
    formattingChunkId: `block0-${label}-chunk-formatacao`,
    motherboardChunkId: `block0-${label}-chunk-placa-mae`,
    bindingId: `block0-${label}-binding`,
    accountId: `block0-${label}-account`,
    inboxId: `block0-${label}-inbox`,
    externalConversationId: `block0-${label}-external-conversation`,
    internalConversationId: `block0-${label}-internal-conversation`,
    contactId: `block0-${label}-contact`,
  };
}

export async function seedProductionHttpFixture(
  prisma,
  {
    label,
    chatwootBaseUrl,
    providerBaseUrl,
    precreateConversation = false,
    contextVersion = 1,
    includeOldHistory = false,
    motherboardAuthorityPlacement = "AFTER_800",
  },
) {
  const ids = fixtureIds(label);
  if (!["AFTER_250", "AFTER_800"].includes(motherboardAuthorityPlacement)) {
    throw new Error(
      `Unknown motherboard authority placement: ${motherboardAuthorityPlacement}`,
    );
  }
  const motherboardAuthorityText =
    motherboardAuthorityPlacement === "AFTER_250"
      ? MOTHERBOARD_AUTHORITY_AFTER_250_TEXT
      : MOTHERBOARD_AUTHORITY_TEXT;
  const providerSecret = encryptTestSecret(TEST_PROVIDER_TOKEN);
  const chatwootSecret = encryptTestSecret(TEST_CHATWOOT_TOKEN);
  const webhookSecret = encryptTestSecret(TEST_WEBHOOK_SECRET);
  const processedAt = new Date("2026-07-24T11:00:00.000Z");

  await prisma.company.create({
    data: {
      id: ids.companyId,
      name: `Empresa Fictícia ${label.toUpperCase()}`,
      timezone: "America/Campo_Grande",
      status: "ACTIVE",
    },
  });

  await prisma.assistant.create({
    data: {
      id: ids.assistantId,
      companyId: ids.companyId,
      name: `Assistente Fictício ${label.toUpperCase()}`,
      description: "Atendimento técnico e comercial de informática para testes isolados.",
      timezone: "America/Campo_Grande",
      weeklySchedule: OFFICIAL_WEEKLY_SCHEDULE,
      aiAlwaysAvailable: true,
      instructions:
        "Responda com naturalidade, use somente dados oficiais fornecidos e ofereça um próximo passo útil quando necessário.",
      personality: "Atenciosa, objetiva e comercial sem pressão.",
      toneOfVoice: "Profissional e acolhedor.",
      model: "block0-fake-model",
      temperature: 0.2,
      fallbackMessage: "Não consegui concluir esta resposta agora.",
      safetyInstruction: "Não invente preços, agenda ou políticas.",
      ragEnabled: true,
      memoryEnabled: false,
      memoryPrePromptEnabled: false,
      memoryExtractionEnabled: false,
      semanticMemoryEnabled: false,
      messageBufferEnabled: false,
      messageBufferSeconds: 0,
      splitResponseEnabled: false,
      splitResponseStyle: "SINGLE",
      status: "ACTIVE",
    },
  });

  await prisma.companyAiSettings.create({
    data: {
      companyId: ids.companyId,
      runtimeEnabled: true,
      provider: "openai-compatible",
      baseUrl: providerBaseUrl,
      model: "block0-fake-model",
      encryptedApiKey: providerSecret.encryptedValue,
      apiKeyIv: providerSecret.iv,
      apiKeyAuthTag: providerSecret.authTag,
      requestTimeoutMs: 2_000,
      status: "ACTIVE",
    },
  });

  await prisma.assistantBehavior.create({
    data: {
      id: ids.behaviorId,
      assistantId: ids.assistantId,
      attendantName: "Atendente Virtual",
      showAttendantName: false,
      role: "Atendimento técnico e comercial",
      howItActs: "Entende a necessidade, informa dados oficiais e orienta o próximo passo.",
      personality: "Atenciosa e objetiva.",
      toneOfVoice: "Profissional e natural.",
      responseStyle: "whatsapp",
      emojiUsage: "none",
      noInventInfo: true,
      unknownBehavior: "fallback",
      maxBlockLength: 300,
    },
  });

  await prisma.assistantFlow.create({
    data: {
      id: ids.flowId,
      assistantId: ids.assistantId,
      name: "Assistência Técnica",
      description: "Atendimento de manutenção e reparo de computadores.",
      priority: 100,
      triggerKeywords: JSON.stringify([
        "formatar",
        "formatação",
        "placa-mãe",
        "placa mae",
        "computador lento",
        "lento",
      ]),
      triggerDescription:
        "Dúvidas sobre diagnóstico, manutenção, formatação ou reparo de computador.",
      triggerExamples: "formatar computador; computador lento; consertar placa-mãe",
      flowInstructions:
        "Use evidência técnica disponível e não apresente diagnóstico incerto como fato.",
      allowedToolSlugs: JSON.stringify([]),
      knowledgeScope: JSON.stringify(["formatacao", "placa_mae", "suporte_tecnico"]),
      runtimeScope: "V1_ONLY",
      runtimeCategory: null,
      runtimeIntent: null,
      runtimeAuthority: null,
      runtimeDirectOnly: null,
      finalAction: "respond",
      autoRespond: true,
      requiresHuman: false,
      active: true,
    },
  });

  await prisma.assistantKnowledge.create({
    data: {
      id: ids.knowledgeId,
      assistantId: ids.assistantId,
      companyId: ids.companyId,
      title: "Autoridades comerciais oficiais",
      content: `${FORMATTING_AUTHORITY_TEXT}\n\n${motherboardAuthorityText}`,
      status: "ACTIVE",
      processingStatus: "READY",
      chunkCount: 2,
      processedAt,
      metadata: {
        type: "TEXT",
        tags: ["formatacao", "placa_mae", "suporte_tecnico"],
        scope: "commercial_authority",
      },
    },
  });

  await prisma.assistantKnowledgeChunk.createMany({
    data: [
      {
        id: ids.formattingChunkId,
        companyId: ids.companyId,
        assistantId: ids.assistantId,
        knowledgeId: ids.knowledgeId,
        chunkIndex: 0,
        content: FORMATTING_AUTHORITY_TEXT,
        embedding: [1, 0, 0],
        embeddingModel: "block0-fake-embedding",
        embeddingDimension: 3,
        status: "ACTIVE",
      },
      {
        id: ids.motherboardChunkId,
        companyId: ids.companyId,
        assistantId: ids.assistantId,
        knowledgeId: ids.knowledgeId,
        chunkIndex: 1,
        content: motherboardAuthorityText,
        embedding: [1, 0, 0],
        embeddingModel: "block0-fake-embedding",
        embeddingDimension: 3,
        status: "ACTIVE",
      },
    ],
  });

  await prisma.chatwootInboxConfig.create({
    data: {
      id: ids.bindingId,
      companyId: ids.companyId,
      assistantId: ids.assistantId,
      name: `Binding fictício ${label.toUpperCase()}`,
      baseUrl: chatwootBaseUrl,
      accountId: ids.accountId,
      inboxId: ids.inboxId,
      apiAccessTokenEncrypted: chatwootSecret.encryptedValue,
      apiAccessTokenIv: chatwootSecret.iv,
      apiAccessTokenAuthTag: chatwootSecret.authTag,
      webhookSecretEncrypted: webhookSecret.encryptedValue,
      webhookSecretIv: webhookSecret.iv,
      webhookSecretAuthTag: webhookSecret.authTag,
      isActive: true,
      metadataJson: {
        fixture: "production-http-harness",
        connected: true,
      },
    },
  });

  if (precreateConversation) {
    await prisma.assistantConversation.create({
      data: {
        id: ids.internalConversationId,
        companyId: ids.companyId,
        assistantId: ids.assistantId,
        title: `Conversa fictícia ${label.toUpperCase()}`,
        source: "CHATWOOT",
        channelType: "WHATSAPP",
        sourceProvider: "chatwoot",
        externalAccountId: ids.accountId,
        externalConversationId: ids.externalConversationId,
        externalContactId: ids.contactId,
        externalChannelId: ids.inboxId,
        externalInboxId: ids.inboxId,
        aiActive: true,
        pausedByHuman: false,
        status: "ACTIVE",
        currentContextVersion: contextVersion,
      },
    });

    if (includeOldHistory) {
      await prisma.assistantConversationMessage.createMany({
        data: [
          {
            id: `block0-${label}-old-user-message`,
            companyId: ids.companyId,
            assistantId: ids.assistantId,
            conversationId: ids.internalConversationId,
            role: "user",
            content: "OLD_CONTEXT_SENTINEL_USER",
            source: "chatwoot",
            messageType: "text",
            externalMessageId: `block0-${label}-old-external-user`,
            contextVersion: Math.max(1, contextVersion - 1),
            createdAt: new Date("2026-07-24T09:00:00.000Z"),
          },
          {
            id: `block0-${label}-old-assistant-message`,
            companyId: ids.companyId,
            assistantId: ids.assistantId,
            conversationId: ids.internalConversationId,
            role: "assistant",
            content: "OLD_CONTEXT_SENTINEL_ASSISTANT",
            source: "chatwoot",
            messageType: "text",
            externalMessageId: `block0-${label}-old-external-assistant`,
            contextVersion: Math.max(1, contextVersion - 1),
            createdAt: new Date("2026-07-24T09:01:00.000Z"),
          },
        ],
      });
    }
  }

  return {
    ...ids,
    contextVersion,
    webhookSecret: TEST_WEBHOOK_SECRET,
    formattingAuthority: {
      serviceKey: "formatacao",
      currency: "BRL",
      amount: 1950,
      qualifier: "starting_at",
    },
    motherboardAuthority: {
      serviceKey: "placa_mae",
      currency: "BRL",
      amount: 395,
      qualifier: "starting_at",
      factPosition: motherboardAuthorityText.indexOf("R$ 395,00"),
      placement: motherboardAuthorityPlacement,
    },
  };
}
