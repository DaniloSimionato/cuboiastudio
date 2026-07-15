import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import {
  InMemoryConversationStateStore,
  MemoryEvidenceAdapter,
  RuntimeV2ShadowOrchestrator,
  createMemoryRetrievalObservation,
  resolveAuthority,
} from "../dist/runtime-v2/index.js";

const prisma = new PrismaClient();

const now = new Date("2026-07-15T12:00:00.000Z");
const scope = {
  companyId: "memory-company-a",
  assistantId: "memory-assistant-a",
  contactId: "memory-contact-a",
  conversationId: "memory-conversation-a",
  contextVersion: 2,
};

function item(overrides = {}) {
  return {
    memoryItemId: "memory-item-a",
    profileId: scope.contactId,
    companyId: scope.companyId,
    assistantId: scope.assistantId,
    contactId: scope.contactId,
    category: "PREFERENCE",
    type: "PREFERENCE",
    status: "ACTIVE",
    confidence: 0.92,
    temporary: false,
    expiresAt: null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    sourceMessageId: "memory-source-message-a",
    sourceConversationId: null,
    contextVersion: null,
    valueHash: "memory-value-hash-a",
    isSensitive: false,
    sharedAcrossAssistants: false,
    embeddingPresent: false,
    ...overrides,
  };
}

function observation(items = [item()], overrides = {}) {
  return {
    retrievalExecuted: true,
    retrievalSource: "V1_PIPELINE",
    companyId: scope.companyId,
    assistantId: scope.assistantId,
    contactId: scope.contactId,
    conversationId: scope.conversationId,
    contextVersion: scope.contextVersion,
    internalMessageId: "memory-message-a",
    profileId: scope.contactId,
    observedAt: now.toISOString(),
    configurationSnapshot: {
      memoryEnabled: true,
      memoryExtractionEnabled: true,
      allowedCategories: ["PREFERENCE", "IDENTITY"],
      confidenceThreshold: 0.7,
      temporaryDefaultDays: 30,
      sharedAcrossAssistants: false,
    },
    resultCount: items.length,
    items,
    ...overrides,
  };
}

function read(items, requestedCategories = ["CONTACT_PREFERENCE"], options = {}) {
  return new MemoryEvidenceAdapter().read({
    scope,
    requestedCategories,
    observation: observation(items, options.observation),
    currentTime: now,
    policy: options.policy,
  });
}

test("observação não executada não inicia busca ou extração", () => {
  const result = new MemoryEvidenceAdapter().read({
    scope,
    requestedCategories: ["CONTACT_PREFERENCE"],
    observation: observation([], { retrievalExecuted: false }),
    currentTime: now,
  });
  assert.equal(result.adapterStatus, "NOT_EXECUTED");
  assert.equal(result.manifest.memoryContentPersisted, false);
  assert.equal(result.manifest.memoryWritePerformed, false);
});

test("memória permanente ativa é contextual e permanece sem autoridade", () => {
  const result = read([item()]);
  assert.equal(result.evidence.length, 1);
  assert.equal(result.evidence[0].sourceType, "CONTACT_MEMORY");
  assert.equal(result.evidence[0].authorityLevel, "CONTEXTUAL");
  assert.equal(result.evidence[0].isAuthoritative, false);
  const decision = resolveAuthority({
    requestedCategory: "CONTACT_PREFERENCE",
    candidates: result.evidence,
    scope,
    currentTime: now,
  });
  assert.notEqual(decision.status, "AUTHORIZED");
});

test("memória temporária válida respeita conversa e contextVersion", () => {
  const result = read(
    [
      item({
        memoryItemId: "temporary-a",
        category: "TEMPORARY_CONTEXT",
        temporary: true,
        expiresAt: "2026-07-20T00:00:00.000Z",
        sourceConversationId: scope.conversationId,
        contextVersion: scope.contextVersion,
      }),
    ],
    ["TECHNICAL_INFORMATION"],
    {
      observation: {
        configurationSnapshot: {
          ...observation().configurationSnapshot,
          allowedCategories: ["TECHNICAL_INFORMATION"],
        },
      },
    },
  );
  assert.equal(result.evidence.length, 1);
  assert.equal(result.evidence[0].category, "TECHNICAL_INFORMATION");
});

test("memória temporária expirada é rejeitada", () => {
  const result = read(
    [
      item({
        category: "TECHNICAL_INFORMATION",
        temporary: true,
        expiresAt: "2026-07-01T00:00:00.000Z",
        sourceConversationId: scope.conversationId,
        contextVersion: scope.contextVersion,
      }),
    ],
    ["TECHNICAL_INFORMATION"],
    {
      observation: {
        configurationSnapshot: {
          ...observation().configurationSnapshot,
          allowedCategories: ["TECHNICAL_INFORMATION"],
        },
      },
    },
  );
  assert.equal(result.evidence.length, 0);
  assert.equal(result.manifest.memoryExpiredRejected, 1);
});

test("memória temporária sem expiresAt é inválida", () => {
  const result = read(
    [
      item({
        category: "TECHNICAL_INFORMATION",
        temporary: true,
        sourceConversationId: scope.conversationId,
        contextVersion: scope.contextVersion,
      }),
    ],
    ["TECHNICAL_INFORMATION"],
    {
      observation: {
        configurationSnapshot: {
          ...observation().configurationSnapshot,
          allowedCategories: ["TECHNICAL_INFORMATION"],
        },
      },
    },
  );
  assert.equal(result.manifest.memoryMissingExpiryRejected, 1);
});

test("company, assistant, contact, profile, conversation e contextVersion divergentes são isolados", () => {
  const cases = [
    ["company", { companyId: "memory-company-b" }, "memoryCrossTenantRejected"],
    [
      "assistant",
      { assistantId: "memory-assistant-b", sharedAcrossAssistants: false },
      "memoryCrossAssistantRejected",
    ],
    ["contact", { contactId: "memory-contact-b" }, "memoryCrossContactRejected"],
    ["profile", { profileId: "memory-profile-b" }, "memoryCrossContactRejected"],
    [
      "conversation",
      {
        temporary: true,
        category: "TECHNICAL_INFORMATION",
        expiresAt: "2026-07-20T00:00:00.000Z",
        sourceConversationId: "memory-conversation-b",
        contextVersion: scope.contextVersion,
      },
      "memoryContextVersionRejected",
    ],
    [
      "context",
      {
        temporary: true,
        category: "TECHNICAL_INFORMATION",
        expiresAt: "2026-07-20T00:00:00.000Z",
        sourceConversationId: scope.conversationId,
        contextVersion: 1,
      },
      "memoryContextVersionRejected",
    ],
  ];
  for (const [, overrides, manifestKey] of cases) {
    const isTechnical = overrides.category === "TECHNICAL_INFORMATION";
    const result = read(
      [item(overrides)],
      [isTechnical ? "TECHNICAL_INFORMATION" : "CONTACT_PREFERENCE"],
      isTechnical
        ? {
            observation: {
              configurationSnapshot: {
                ...observation().configurationSnapshot,
                allowedCategories: ["TECHNICAL_INFORMATION"],
              },
            },
          }
        : {},
    );
    assert.equal(result.evidence.length, 0);
    assert.ok(result.manifest[manifestKey] > 0);
  }
});

test("status inativo, excluído e sensível não entram no manifesto factual", () => {
  for (const overrides of [{ status: "INACTIVE" }, { status: "DELETED" }, { isSensitive: true }]) {
    const result = read([item(overrides)]);
    assert.equal(result.evidence.length, 0);
  }
  const sensitive = read([item({ isSensitive: true })]);
  assert.equal(sensitive.manifest.memorySensitiveRejected, 1);
});

test("confiança abaixo do threshold e categoria não permitida são rejeitadas", () => {
  assert.equal(read([item({ confidence: 0.69 })]).evidence.length, 0);
  const result = read([item()], ["TECHNICAL_INFORMATION"]);
  assert.equal(result.evidence.length, 0);
  assert.equal(result.manifest.memoryCategoryRejected, 1);
});

test("compartilhamento entre assistentes é negado por padrão e só permite fixture explícita", () => {
  const crossAssistant = item({ assistantId: "memory-assistant-b", sharedAcrossAssistants: true });
  const denied = read([crossAssistant]);
  assert.equal(denied.evidence.length, 0);
  assert.equal(denied.manifest.memorySharingDisabledRejected, 1);
  const allowed = read([crossAssistant], ["CONTACT_PREFERENCE"], {
    policy: { sharingAcrossAssistants: "ALLOW" },
  });
  assert.equal(allowed.evidence.length, 0);
});

test("memória comercial, horário, availability, booking e contato oficial são rejeitados", () => {
  for (const category of [
    "PRICE",
    "BUSINESS_HOURS",
    "AVAILABILITY",
    "BOOKING",
    "OFFICIAL_CONTACT",
    "COMMERCIAL_POLICY",
  ]) {
    const result = read([item({ category })], [category]);
    assert.equal(result.evidence.length, 0, category);
    assert.equal(result.manifest.memoryCategoryRejected, 1, category);
  }
});

test("identidade e preferência do próprio contato são aceitas apenas como contexto", () => {
  for (const [raw, expected] of [
    ["IDENTITY", "CUSTOMER_IDENTITY"],
    ["PREFERENCE", "CONTACT_PREFERENCE"],
  ]) {
    const result = read([item({ category: raw })], [expected]);
    assert.equal(result.evidence.length, 1);
    assert.equal(result.evidence[0].category, expected);
    assert.equal(result.evidence[0].authorityLevel, "CONTEXTUAL");
  }
});

test("memória permanente sem validade permanece UNKNOWN, sem virar autoridade", () => {
  const result = read([item({ expiresAt: null })]);
  assert.equal(result.evidence[0].freshnessStatus, "UNKNOWN");
  assert.equal(result.evidence[0].isAuthoritative, false);
});

test("dois itens ativos com hashes diferentes registram conflito sem escolher maior confidence", () => {
  const result = read([
    item({ memoryItemId: "memory-a", valueHash: "hash-a" }),
    item({ memoryItemId: "memory-b", valueHash: "hash-b", confidence: 0.99 }),
  ]);
  assert.equal(result.evidence.length, 2);
  assert.equal(result.manifest.memoryConflictDetected, true);
});

test("observação de memória não transporta valor, texto de origem ou embedding", () => {
  const result = createMemoryRetrievalObservation({
    companyId: scope.companyId,
    assistantId: scope.assistantId,
    contactId: scope.contactId,
    conversationId: scope.conversationId,
    contextVersion: scope.contextVersion,
    internalMessageId: "memory-message-sanitized",
    profileId: scope.contactId,
    observedAt: now,
    retrievalExecuted: true,
    configurationSnapshot: observation().configurationSnapshot,
    selectedMemories: [
      {
        ...item(),
        id: "memory-item-a",
        contentHash: "memory-value-hash-a",
        value: "texto integral não deve aparecer",
        sourceMessageText: "origem não deve aparecer",
        embedding: [1, 2, 3],
      },
    ],
  });
  const serialized = JSON.stringify(result);
  assert.doesNotMatch(serialized, /texto integral|origem não deve|"embedding"\s*:/);
  assert.match(serialized, /memory-item-a/);
  assert.match(serialized, /memory-value-hash-a/);
});

test("hash e IDs são determinísticos e não há API de escrita no adapter", () => {
  const input = {
    companyId: scope.companyId,
    assistantId: scope.assistantId,
    contactId: scope.contactId,
    conversationId: scope.conversationId,
    contextVersion: scope.contextVersion,
    internalMessageId: "memory-message-hash",
    retrievalExecuted: true,
    configurationSnapshot: observation().configurationSnapshot,
    selectedMemories: [{ ...item(), id: "memory-item-a", contentHash: "memory-value-hash-a" }],
  };
  const first = createMemoryRetrievalObservation(input);
  const second = createMemoryRetrievalObservation(input);
  assert.equal(first.items[0].memoryItemId, second.items[0].memoryItemId);
  assert.equal(first.items[0].valueHash, second.items[0].valueHash);
  assert.equal(typeof MemoryEvidenceAdapter.prototype.read, "function");
  assert.equal("write" in MemoryEvidenceAdapter.prototype, false);
});

test("Shadow Metadata combina memória sem provider, ferramenta ou outbound V2", async () => {
  const adapter = new MemoryEvidenceAdapter();
  const orchestrator = new RuntimeV2ShadowOrchestrator(
    new InMemoryConversationStateStore(),
    {
      RUNTIME_V2_MODE: "SHADOW",
      RUNTIME_V2_SHADOW_ASSISTANT_IDS: scope.assistantId,
      RUNTIME_V2_EVIDENCE_MODE: "SHADOW_METADATA",
    },
    () => now,
    undefined,
    undefined,
    adapter,
  );
  const result = await orchestrator.process({
    scope,
    correlationId: "memory-correlation",
    internalMessageId: "memory-orchestrator-message",
    source: "CUSTOMER",
    messageType: "TEXT",
    currentMessage: "Qual é a preferência?",
    memoryObservation: observation(),
  });
  assert.equal(result.manifest.evidence.memory.memoryRetrievalExecuted, true);
  assert.equal(result.manifest.evidence.memory.memoryEvidenceCount, 1);
  assert.equal(result.manifest.evidence.memory.memoryContentPersisted, false);
  assert.equal(result.manifest.evidence.memory.memoryWritePerformed, false);
  assert.equal(result.manifest.providerCalled, false);
  assert.equal(result.manifest.toolCalls, 0);
  assert.equal(result.manifest.outboundSent, false);
});

test("OFF e SHADOW sem SHADOW_METADATA não observam memória", async () => {
  let calls = 0;
  const adapter = {
    read(input) {
      calls += 1;
      return new MemoryEvidenceAdapter().read(input);
    },
  };
  const snapshot = {
    scope,
    correlationId: "memory-off-correlation",
    internalMessageId: "memory-off-message",
    source: "CUSTOMER",
    messageType: "TEXT",
    currentMessage: "oi",
    memoryObservation: observation(),
  };
  const off = new RuntimeV2ShadowOrchestrator(new InMemoryConversationStateStore(), {}, () => now);
  assert.equal((await off.process(snapshot)).manifest, null);
  const shadow = new RuntimeV2ShadowOrchestrator(
    new InMemoryConversationStateStore(),
    { RUNTIME_V2_MODE: "SHADOW", RUNTIME_V2_SHADOW_ASSISTANT_IDS: scope.assistantId },
    () => now,
    undefined,
    undefined,
    adapter,
  );
  const result = await shadow.process(snapshot);
  assert.equal(result.manifest.evidence.evidenceMode, "OFF");
  assert.equal(calls, 0);
});

test("duplicidade do mesmo internalMessageId não cria segunda revisão", async () => {
  const orchestrator = new RuntimeV2ShadowOrchestrator(
    new InMemoryConversationStateStore(),
    { RUNTIME_V2_MODE: "SHADOW", RUNTIME_V2_SHADOW_ASSISTANT_IDS: scope.assistantId },
    () => now,
    undefined,
    undefined,
    new MemoryEvidenceAdapter(),
  );
  const snapshot = {
    scope,
    correlationId: "memory-duplicate-correlation",
    internalMessageId: "memory-duplicate-message",
    source: "CUSTOMER",
    messageType: "TEXT",
    currentMessage: "preferência",
    memoryObservation: observation(),
  };
  const first = await orchestrator.process(snapshot);
  const second = await orchestrator.process(snapshot);
  assert.equal(first.state.revision, 1);
  assert.equal(second.state.revision, 1);
  assert.equal(second.manifest.messageAlreadyProcessed, true);
});

test("PostgreSQL mantém itens/eventos intactos e rejeita memória de outro tenant", async () => {
  const suffix = randomUUID().slice(0, 8);
  const companyA = `memory-db-company-a-${suffix}`;
  const companyB = `memory-db-company-b-${suffix}`;
  const assistantA = `memory-db-assistant-a-${suffix}`;
  const assistantB = `memory-db-assistant-b-${suffix}`;
  const profileA = `memory-db-profile-a-${suffix}`;
  const profileB = `memory-db-profile-b-${suffix}`;
  const itemA = `memory-db-item-a-${suffix}`;
  const itemB = `memory-db-item-b-${suffix}`;

  try {
    await prisma.company.createMany({
      data: [
        { id: companyA, name: `Synthetic A ${suffix}` },
        { id: companyB, name: `Synthetic B ${suffix}` },
      ],
    });
    await prisma.assistant.createMany({
      data: [
        { id: assistantA, companyId: companyA, name: `Synthetic Assistant A ${suffix}` },
        { id: assistantB, companyId: companyB, name: `Synthetic Assistant B ${suffix}` },
      ],
    });
    await prisma.contactMemoryProfile.createMany({
      data: [
        {
          id: profileA,
          companyId: companyA,
          assistantId: assistantA,
          identityKey: `synthetic-a-${suffix}`,
          channelType: "UNKNOWN",
        },
        {
          id: profileB,
          companyId: companyB,
          assistantId: assistantB,
          identityKey: `synthetic-b-${suffix}`,
          channelType: "UNKNOWN",
        },
      ],
    });
    await prisma.contactMemoryItem.createMany({
      data: [
        {
          id: itemA,
          profileId: profileA,
          companyId: companyA,
          category: "PREFERENCE",
          key: "synthetic_a",
          value: "synthetic",
          confidence: 0.95,
          sourceType: "MANUAL",
        },
        {
          id: itemB,
          profileId: profileB,
          companyId: companyB,
          category: "PREFERENCE",
          key: "synthetic_b",
          value: "synthetic",
          confidence: 0.95,
          sourceType: "MANUAL",
        },
      ],
    });
    await prisma.contactMemoryEvent.createMany({
      data: [
        { memoryItemId: itemA, companyId: companyA, eventType: "CREATED", sourceType: "MANUAL" },
        { memoryItemId: itemB, companyId: companyB, eventType: "CREATED", sourceType: "MANUAL" },
      ],
    });

    const before = await Promise.all([
      prisma.contactMemoryItem.count({ where: { companyId: { in: [companyA, companyB] } } }),
      prisma.contactMemoryEvent.count({ where: { companyId: { in: [companyA, companyB] } } }),
    ]);
    const result = new MemoryEvidenceAdapter().read({
      scope: {
        companyId: companyA,
        assistantId: assistantA,
        contactId: profileA,
        conversationId: `memory-db-conversation-${suffix}`,
        contextVersion: 1,
      },
      requestedCategories: ["CONTACT_PREFERENCE"],
      observation: observation(
        [
          item({
            memoryItemId: itemB,
            companyId: companyB,
            profileId: profileB,
            contactId: profileB,
            assistantId: assistantB,
          }),
        ],
        {
          companyId: companyA,
          assistantId: assistantA,
          contactId: profileA,
          conversationId: `memory-db-conversation-${suffix}`,
          contextVersion: 1,
          profileId: profileA,
        },
      ),
      currentTime: now,
    });
    const after = await Promise.all([
      prisma.contactMemoryItem.count({ where: { companyId: { in: [companyA, companyB] } } }),
      prisma.contactMemoryEvent.count({ where: { companyId: { in: [companyA, companyB] } } }),
    ]);
    assert.equal(result.evidence.length, 0);
    assert.ok(result.manifest.memoryCrossTenantRejected > 0);
    assert.deepEqual(after, before);
  } finally {
    await prisma.contactMemoryEvent.deleteMany({
      where: { companyId: { in: [companyA, companyB] } },
    });
    await prisma.contactMemoryItem.deleteMany({
      where: { companyId: { in: [companyA, companyB] } },
    });
    await prisma.contactMemoryProfile.deleteMany({
      where: { companyId: { in: [companyA, companyB] } },
    });
    await prisma.assistant.deleteMany({ where: { id: { in: [assistantA, assistantB] } } });
    await prisma.company.deleteMany({ where: { id: { in: [companyA, companyB] } } });
    await prisma.$disconnect();
  }
});
