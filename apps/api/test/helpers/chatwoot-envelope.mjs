export function createSanitizedChatwootEnvelope(input) {
  const occurredAt = input.occurredAt ?? new Date("2026-07-24T12:00:00.000Z");
  const timestampSeconds = Math.floor(occurredAt.getTime() / 1000);
  const accountId = String(input.accountId);
  const inboxId = String(input.inboxId);
  const conversationId = String(input.conversationId);
  const messageId = String(input.messageId);
  const contactId = String(input.contactId ?? `contact-${conversationId}`);
  const senderIdentifier = String(input.senderIdentifier ?? `sender-${conversationId}`);

  return {
    event: "message_created",
    id: `event-${messageId}`,
    created_at: timestampSeconds,
    account: {
      id: accountId,
      name: `Conta fictícia ${accountId}`,
    },
    inbox: {
      id: inboxId,
      identifier: `inbox-${inboxId}`,
      name: `Inbox fictícia ${inboxId}`,
      channel_type: "Channel::Api",
    },
    conversation: {
      id: conversationId,
      inbox_id: inboxId,
      status: "open",
      ai_active: input.aiActive ?? true,
      custom_attributes: {
        ai_active: input.aiActive ?? true,
      },
      additional_attributes: {
        source: "http-harness",
      },
      meta: {
        title: `Conversa fictícia ${conversationId}`,
        sender: {
          id: contactId,
          identifier: senderIdentifier,
          name: "Contato Fictício",
          phone_number: "+00000000000",
          type: "contact",
        },
      },
    },
    message: {
      id: messageId,
      content: input.content,
      message_type: "incoming",
      sender_type: "contact",
      private: false,
      created_at: timestampSeconds,
      source_id: `source-${messageId}`,
      content_attributes: {},
      attachments: [],
      sender: {
        id: contactId,
        identifier: senderIdentifier,
        name: "Contato Fictício",
        phone_number: "+00000000000",
        type: "contact",
      },
    },
    sender: {
      id: contactId,
      identifier: senderIdentifier,
      name: "Contato Fictício",
      phone_number: "+00000000000",
      type: "contact",
    },
    contact: {
      id: contactId,
      identifier: senderIdentifier,
      name: "Contato Fictício",
      phone_number: "+00000000000",
    },
    direction: "incoming",
    private: false,
    ai_active: input.aiActive ?? true,
  };
}
