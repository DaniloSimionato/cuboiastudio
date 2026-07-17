import { createRequire } from "node:module";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { test } from "node:test";
import assert from "node:assert/strict";

const require = createRequire(import.meta.url);
const { AttachmentInterpreterService } = require("../dist/attachments/attachment-interpreter.service.js");
const { ChatwootAttachmentDownloaderService } = require("../dist/chatwoot/chatwoot-attachment-downloader.service.js");
const { AssistantConversationsController } = require("../dist/assistant-conversations/assistant-conversations.controller.js");
const { normalizeChatwootMessageCreatedPayload } = require("../dist/webhooks/chatwoot-normalizer.js");

function createMockProvider(overrides = {}) {
  return {
    isConfigured: () => true,
    transcribeAudio: async () => ({
      transcript: "transcrição mock",
      extractedText: null,
      interpretedSummary: "O usuário enviou um áudio. Transcrição: transcrição mock",
      processingError: null,
      metadataJson: { provider: "mock" },
    }),
    interpretImage: async () => ({
      transcript: null,
      extractedText: "texto lido da imagem",
      interpretedSummary: "imagem descrita",
      processingError: null,
      metadataJson: { provider: "mock" },
    }),
    extractPdfText: async () => ({
      transcript: null,
      extractedText: "texto do pdf via provider",
      interpretedSummary: "pdf via provider",
      processingError: null,
      metadataJson: { provider: "mock" },
    }),
    extractTextFile: async () => ({
      transcript: null,
      extractedText: "texto do documento",
      interpretedSummary: "documento via provider",
      processingError: null,
      metadataJson: { provider: "mock" },
    }),
    summarizeSpreadsheet: async () => ({
      transcript: null,
      extractedText: "coluna A, coluna B",
      interpretedSummary: "planilha resumida",
      processingError: null,
      metadataJson: { provider: "mock" },
    }),
    ...overrides,
  };
}

async function createTempFile(fileName, content) {
  const dir = await mkdtemp(join(tmpdir(), "cubo-attachments-"));
  const filePath = join(dir, fileName);
  await writeFile(filePath, content);
  return {
    dir,
    filePath,
    cleanup: async () => {
      await rm(dir, { recursive: true, force: true });
    },
  };
}

function buildMinimalPdf(text) {
  const escaped = text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n",
    `4 0 obj\n<< /Length 44 >>\nstream\nBT /F1 24 Tf 50 150 Td (${escaped}) Tj ET\nendstream\nendobj\n`,
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += object;
  }

  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${offsets.length}\n`;
  pdf += "0000000000 65535 f \n";
  for (const offset of offsets.slice(1)) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, "utf8");
}

function createUploadedFile({ fileName, mimeType, content }) {
  const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);
  return {
    fieldname: "attachments",
    originalname: fileName,
    encoding: "7bit",
    mimetype: mimeType,
    size: buffer.byteLength,
    buffer,
  };
}

function createMultipartController() {
  const calls = [];
  const service = {
    sendMessage: async (input) => {
      calls.push(input);
      return {
        conversationId: input.conversationId,
        userMessage: {
          id: "user-msg",
          role: "user",
          content: input.dto.message ?? "",
          createdAt: new Date(),
        },
        assistantMessage: {
          id: "assistant-msg",
          role: "assistant",
          content: "ok",
          createdAt: new Date(),
          sources: [],
        },
        runtime: {
          mode: "deterministic-runtime",
          assistant: { id: input.assistantId, name: "Assistente" },
          temperature: 0,
          temperatureSource: "default",
          configurationSource: "tenant-settings",
          fallback: true,
          outcome: "fallback",
          summary: "ok",
        },
      };
    },
  };

  return {
    controller: new AssistantConversationsController(service),
    calls,
  };
}

async function sendMultipartFixture({ attachment, file }) {
  const { controller, calls } = createMultipartController();
  await controller.sendMessageMultipart(
    "assistant-1",
    "conversation-1",
    {
      payload: JSON.stringify({
        message: "Mensagem multimodal",
        source: "tests",
        messageType: attachment.type,
        attachments: [attachment],
      }),
    },
    [file],
    { id: "user-1", companyId: "company-1", email: "demo@example.com", roles: [], permissions: [] },
    { companyId: "company-1" },
  );

  return calls[0].dto.attachments[0];
}

test("mensagem de texto continua funcionando sem anexo", () => {
  const service = new AttachmentInterpreterService(null);
  const runtimeText = service.buildRuntimeInputText({
    rawText: "Olá, tudo bem?",
    attachments: [],
  });

  assert.equal(runtimeText, "Olá, tudo bem?");
});

test("áudio com provider mock gera transcript e runtime recebe transcript", async () => {
  const service = new AttachmentInterpreterService(createMockProvider());
  const temp = await createTempFile("audio.webm", Buffer.from("fake-audio"));

  try {
    const attachment = await service.processAttachment({
      source: "tests",
      fileName: "audio.webm",
      mimeType: "audio/webm",
      storagePath: temp.filePath,
      size: 10,
    });

    assert.equal(attachment.processingStatus, "completed");
    assert.equal(attachment.transcript, "transcrição mock");

    const runtimeText = service.buildRuntimeInputText({
      rawText: "Mensagem inicial",
      attachments: [
        {
          type: "audio",
          fileName: "audio.webm",
          mimeType: "audio/webm",
          processingStatus: attachment.processingStatus,
          transcript: attachment.transcript ?? null,
          extractedText: attachment.extractedText ?? null,
          interpretedSummary: attachment.interpretedSummary ?? null,
          processingError: attachment.processingError ?? null,
        },
      ],
    });

    assert.match(runtimeText, /Transcrição: transcrição mock/);
  } finally {
    await temp.cleanup();
  }
});

test("imagem com provider mock gera summary e extractedText", async () => {
  const service = new AttachmentInterpreterService(createMockProvider());
  const temp = await createTempFile("imagem.jpg", Buffer.from([0, 1, 2, 3]));

  try {
    const attachment = await service.processAttachment({
      source: "tests",
      fileName: "imagem.jpg",
      mimeType: "image/jpeg",
      storagePath: temp.filePath,
      size: 4,
    });

    assert.equal(attachment.processingStatus, "completed");
    assert.equal(attachment.extractedText, "texto lido da imagem");
    assert.equal(attachment.interpretedSummary, "imagem descrita");

    const runtimeText = service.buildRuntimeInputText({
      rawText: null,
      attachments: [
        {
          type: "image",
          fileName: "imagem.jpg",
          mimeType: "image/jpeg",
          processingStatus: attachment.processingStatus,
          transcript: null,
          extractedText: attachment.extractedText ?? null,
          interpretedSummary: attachment.interpretedSummary ?? null,
          processingError: attachment.processingError ?? null,
        },
      ],
    });

    assert.match(runtimeText, /Texto extraído: texto lido da imagem/);
    assert.match(runtimeText, /Descrição: imagem descrita/);
  } finally {
    await temp.cleanup();
  }
});

test("PDF com texto selecionável usa parser local", async () => {
  const service = new AttachmentInterpreterService(null);
  const temp = await createTempFile("documento.pdf", buildMinimalPdf("Hello PDF local"));

  try {
    const attachment = await service.processAttachment({
      source: "tests",
      fileName: "documento.pdf",
      mimeType: "application/pdf",
      storagePath: temp.filePath,
      size: 512,
    });

    assert.equal(attachment.processingStatus, "completed");
    assert.match(attachment.extractedText ?? "", /Hello PDF local/);
    assert.match(attachment.interpretedSummary ?? "", /Conteúdo extraído/);
  } finally {
    await temp.cleanup();
  }
});

test("TXT gera extractedText localmente", async () => {
  const service = new AttachmentInterpreterService(null);
  const temp = await createTempFile("nota.txt", Buffer.from("primeira linha\nsegunda linha", "utf8"));

  try {
    const attachment = await service.processAttachment({
      source: "tests",
      fileName: "nota.txt",
      mimeType: "text/plain",
      storagePath: temp.filePath,
      size: 29,
    });

    assert.equal(attachment.processingStatus, "completed");
    assert.match(attachment.extractedText ?? "", /primeira linha/);
    assert.match(attachment.interpretedSummary ?? "", /Arquivo texto processado localmente/);
  } finally {
    await temp.cleanup();
  }
});

test("upload multipart de imagem pequena envia Buffer real sem dataUrl", async () => {
  const attachment = await sendMultipartFixture({
    attachment: {
      type: "image",
      fileName: "foto.png",
      mimeType: "image/png",
      size: 4,
    },
    file: createUploadedFile({
      fileName: "foto.png",
      mimeType: "image/png",
      content: Buffer.from([0, 1, 2, 3]),
    }),
  });

  assert.equal(attachment.type, "image");
  assert.equal(attachment.fileName, "foto.png");
  assert.equal(attachment.mimeType, "image/png");
  assert.equal(attachment.dataUrl, undefined);
  assert.ok(Buffer.isBuffer(attachment.buffer));
  assert.equal(attachment.buffer.byteLength, 4);
});

test("upload multipart de PDF pequeno envia Buffer real", async () => {
  const attachment = await sendMultipartFixture({
    attachment: {
      type: "document",
      fileName: "documento.pdf",
      mimeType: "application/pdf",
      size: 100,
    },
    file: createUploadedFile({
      fileName: "documento.pdf",
      mimeType: "application/pdf",
      content: buildMinimalPdf("PDF multipart"),
    }),
  });

  assert.equal(attachment.type, "document");
  assert.equal(attachment.mimeType, "application/pdf");
  assert.ok(Buffer.isBuffer(attachment.buffer));
});

test("upload multipart de áudio webm válido envia Buffer real", async () => {
  const attachment = await sendMultipartFixture({
    attachment: {
      type: "audio",
      fileName: "audio.webm",
      mimeType: "audio/webm",
      size: 16,
      durationSeconds: 3,
    },
    file: createUploadedFile({
      fileName: "audio.webm",
      mimeType: "audio/webm",
      content: Buffer.from("fake-webm-audio"),
    }),
  });

  assert.equal(attachment.type, "audio");
  assert.equal(attachment.mimeType, "audio/webm");
  assert.equal(attachment.durationSeconds, 3);
  assert.ok(Buffer.isBuffer(attachment.buffer));
});

test("upload multipart rejeita arquivo acima do limite com erro amigável", async () => {
  const { controller } = createMultipartController();
  const hugeSize = 11 * 1024 * 1024;

  assert.throws(
    () =>
      controller.sendMessageMultipart(
        "assistant-1",
        "conversation-1",
        {
          payload: JSON.stringify({
            message: "Imagem grande",
            source: "tests",
            messageType: "image",
            attachments: [{ type: "image", fileName: "grande.png", mimeType: "image/png" }],
          }),
        },
        [
          {
            fieldname: "attachments",
            originalname: "grande.png",
            encoding: "7bit",
            mimetype: "image/png",
            size: hugeSize,
            buffer: Buffer.from([1]),
          },
        ],
        { id: "user-1", companyId: "company-1", email: "demo@example.com", roles: [], permissions: [] },
        { companyId: "company-1" },
      ),
    /Arquivo muito grande. Limite: 10 MB/,
  );
});

test("upload multipart rejeita MIME inválido", async () => {
  const { controller } = createMultipartController();

  assert.throws(
    () =>
      controller.sendMessageMultipart(
        "assistant-1",
        "conversation-1",
        {
          payload: JSON.stringify({
            message: "Arquivo inválido",
            source: "tests",
            messageType: "image",
            attachments: [{ type: "image", fileName: "arquivo.exe", mimeType: "application/x-msdownload" }],
          }),
        },
        [
          createUploadedFile({
            fileName: "arquivo.exe",
            mimeType: "application/x-msdownload",
            content: Buffer.from("invalid"),
          }),
        ],
        { id: "user-1", companyId: "company-1", email: "demo@example.com", roles: [], permissions: [] },
        { companyId: "company-1" },
      ),
    /Tipo de arquivo não suportado/,
  );
});

test("falha no provider marca attachment como failed e runtime recebe fallback honesto", async () => {
  const service = new AttachmentInterpreterService(
    createMockProvider({
      transcribeAudio: async () => {
        throw new Error("provider indisponível");
      },
    }),
  );
  const temp = await createTempFile("audio.webm", Buffer.from("fake-audio"));

  try {
    const attachment = await service.processAttachment({
      source: "tests",
      fileName: "audio.webm",
      mimeType: "audio/webm",
      storagePath: temp.filePath,
      size: 10,
    });

    assert.equal(attachment.processingStatus, "failed");
    assert.match(attachment.processingError ?? "", /provider indisponível/);

    const runtimeText = service.buildRuntimeInputText({
      rawText: null,
      attachments: [
        {
          type: "audio",
          fileName: "audio.webm",
          mimeType: "audio/webm",
          processingStatus: attachment.processingStatus,
          transcript: attachment.transcript ?? null,
          extractedText: attachment.extractedText ?? null,
          interpretedSummary: attachment.interpretedSummary ?? null,
          processingError: attachment.processingError ?? null,
        },
      ],
    });

    assert.match(runtimeText, /Erro de processamento: provider indisponível/);
  } finally {
    await temp.cleanup();
  }
});

test("normalizador do Chatwoot preserva anexos estruturados", () => {
  const normalized = normalizeChatwootMessageCreatedPayload({
    conversation: {
      id: "conv_1",
      meta: { title: "Conversa WhatsApp", sender: { name: "Cliente final" } },
    },
    contact: {
      id: "contact_1",
      name: "Maria",
      phone_number: "+5511999999999",
    },
    inbox: {
      id: "inbox_1",
      identifier: "chatwoot-inbox",
    },
    message: {
      id: "msg_1",
      content: "Mensagem com anexo",
      message_type: "incoming",
      attachments: [
        {
          file_name: "foto.jpg",
          mime_type: "image/jpeg",
          data_url: "data:image/jpeg;base64,AA==",
          thumb_url: "https://example.com/thumb.jpg",
          attachment_storage_pending: true,
        },
      ],
      location: {
        label: "Escritório",
        latitude: "-20.0",
        longitude: "-54.0",
      },
    },
  });

  assert.equal(normalized.externalConversationId, "conv_1");
  assert.equal(normalized.dto.source, "chatwoot");
  assert.equal(normalized.dto.attachments?.[0]?.fileName, "foto.jpg");
  assert.equal(normalized.dto.attachments?.[0]?.dataUrl, "data:image/jpeg;base64,AA==");
  assert.equal(normalized.dto.attachments?.[0]?.thumbUrl, "https://example.com/thumb.jpg");
  assert.equal(normalized.dto.attachments?.[0]?.attachmentStoragePending, true);
  assert.equal(normalized.dto.contact, undefined);
  assert.equal(normalized.dto.location?.label, "Escritório");
  assert.equal(normalized.senderName, "Maria");
  assert.equal(normalized.conversationMetaSender, "Cliente final");
});

test("normalizador só trata contato como conteúdo quando ele vem da mensagem", () => {
  const normalized = normalizeChatwootMessageCreatedPayload({
    contact: {
      id: "sender-contact",
      name: "Remetente",
      phone_number: "+5500000000000",
    },
    message: {
      id: "msg_contact_1",
      content: "Cartão compartilhado",
      message_type: "incoming",
      content_attributes: {
        contact: {
          name: "Contato compartilhado",
          phone_number: "+5511111111111",
        },
      },
    },
    conversation: { id: "conv_contact_1" },
  });

  assert.equal(normalized.dto.contact?.name, "Contato compartilhado");
  assert.equal(normalized.dto.contact?.phone, "+5511111111111");
});

test("normalizador não usa localização de metadados raiz como conteúdo da mensagem", () => {
  const normalized = normalizeChatwootMessageCreatedPayload({
    location: { label: "Metadado da conversa", latitude: -20, longitude: -54 },
    message: { id: "msg_text_1", content: "Mensagem textual", message_type: "incoming" },
    conversation: { id: "conv_text_1" },
  });

  assert.equal(normalized.dto.location, undefined);
});

test("normalizador preserva a forma de exibição do conteúdo textual do webhook", () => {
  const normalized = normalizeChatwootMessageCreatedPayload({
    message: {
      id: "msg_whitespace_1",
      content: "  Texto com bordas  ",
      message_type: "incoming",
    },
    conversation: { id: "conv_whitespace_1" },
  });

  assert.equal(normalized.dto.message, "  Texto com bordas  ");
});

test("normalizador do Chatwoot extrai attachment do topo e infere tipo real do arquivo", () => {
  const normalized = normalizeChatwootMessageCreatedPayload({
    id: "msg_top_1",
    event: "message_created",
    content: "",
    message_type: "incoming",
    inbox: { id: "inbox_1", identifier: "chatwoot-inbox" },
    conversation: {
      id: "conv_top_1",
      meta: { title: "Conversa WhatsApp" },
    },
    sender: {
      id: "contact_1",
      name: "Maria",
      phone_number: "+5511999999999",
    },
    attachments: [
      {
        file_type: "audio",
        content_type: "application/octet-stream",
        file_url: "/rails/active_storage/blobs/redirect/abc/voice-note.ogg",
      },
    ],
  });

  assert.equal(normalized.dto.attachments?.length, 1);
  assert.equal(normalized.dto.attachments?.[0]?.type, "audio");
  assert.equal(normalized.dto.attachments?.[0]?.fileName, "voice-note.ogg");
  assert.equal(
    normalized.dto.attachments?.[0]?.url,
    "/rails/active_storage/blobs/redirect/abc/voice-note.ogg",
  );
});

test("download de anexo do Chatwoot usa data_url e api_access_token", async () => {
  const service = new ChatwootAttachmentDownloaderService({
    get: (key) => {
      if (key === "CHATWOOT_ATTACHMENT_DOWNLOAD_TIMEOUT_MS") {
        return 5000;
      }

      return undefined;
    },
  });
  const originalFetch = globalThis.fetch;
  const fetchCalls = [];

  globalThis.fetch = async (url, init) => {
    fetchCalls.push({ url, init });
    return {
      ok: true,
      status: 200,
      headers: {
        get: (name) => {
          if (name === "content-type") {
            return "image/png";
          }
          if (name === "content-length") {
            return "4";
          }
          return null;
        },
      },
      arrayBuffer: async () => Uint8Array.from([1, 2, 3, 4]).buffer,
    };
  };

  try {
    const result = await service.downloadAttachment({
      config: {
        companyId: "company-1",
        assistantId: "assistant-1",
        baseUrl: "https://chatwoot.example.com",
        apiAccessToken: "user-api-token",
      },
      attachment: {
        type: "image",
        fileName: "foto.png",
        mimeType: "image/png",
        dataUrl: null,
        url: "https://chatwoot.example.com/attachments/1",
        thumbUrl: "https://chatwoot.example.com/thumb/1",
      },
    });

    assert.equal(fetchCalls.length, 1);
    assert.equal(fetchCalls[0].url, "https://chatwoot.example.com/attachments/1");
    assert.equal(fetchCalls[0].init.redirect, "manual");
    assert.equal(fetchCalls[0].init.headers.api_access_token, "user-api-token");
    assert.equal(fetchCalls[0].init.headers.Authorization, undefined);
    assert.equal(result.sizeBytes, 4);
    assert.equal(result.sourceUrl, "https://chatwoot.example.com/attachments/1");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("download de anexo do Chatwoot resolve URL relativa e não vaza token em redirect externo", async () => {
  const service = new ChatwootAttachmentDownloaderService({
    get: (key) => {
      if (key === "CHATWOOT_ATTACHMENT_DOWNLOAD_TIMEOUT_MS") {
        return 5000;
      }

      return undefined;
    },
  });
  const originalFetch = globalThis.fetch;
  const fetchCalls = [];

  globalThis.fetch = async (url, init) => {
    fetchCalls.push({ url, init });

    if (String(url).includes("/rails/active_storage/blobs/redirect/abc")) {
      return {
        ok: false,
        status: 302,
        headers: {
          get: (name) => (name === "location" ? "https://storage.examplecdn.com/signed/file.jpg?signature=abc" : null),
        },
      };
    }

    return {
      ok: true,
      status: 200,
      headers: {
        get: (name) => {
          if (name === "content-type") {
            return "image/jpeg";
          }
          if (name === "content-length") {
            return "4";
          }
          return null;
        },
      },
      arrayBuffer: async () => Uint8Array.from([1, 2, 3, 4]).buffer,
    };
  };

  try {
    const result = await service.downloadAttachment({
      config: {
        companyId: "company-1",
        assistantId: "assistant-1",
        baseUrl: "https://chatwoot.example.com",
        apiAccessToken: "user-api-token",
      },
      attachment: {
        type: "document",
        fileName: "image.jpg",
        mimeType: "application/octet-stream",
        dataUrl: null,
        url: "/rails/active_storage/blobs/redirect/abc/image.jpg",
        thumbUrl: null,
      },
    });

    assert.equal(fetchCalls.length, 2);
    assert.equal(fetchCalls[0].url, "https://chatwoot.example.com/rails/active_storage/blobs/redirect/abc/image.jpg");
    assert.equal(fetchCalls[0].init.headers.api_access_token, "user-api-token");
    assert.equal(fetchCalls[1].url, "https://storage.examplecdn.com/signed/file.jpg?signature=abc");
    assert.equal(fetchCalls[1].init.headers.api_access_token, undefined);
    assert.equal(result.resolvedType, "image");
    assert.equal(result.mimeType, "image/jpeg");
    assert.equal(result.sourceUrl, "https://storage.examplecdn.com/signed/file.jpg?signature=abc");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
