/**
 * cuboChatService
 *
 * 🔐 Tokens administrativos do Cubo.Chat/Chatwoot são de alto risco.
 * Eles NUNCA podem trafegar no bundle do navegador. O frontend só
 * conversa com /api/settings/cubo-chat — o backend atua como proxy.
 */
import type { CuboChatSettings, SecureStatus } from "@/types";
import { mockDelay } from "./apiClient";

export const cuboChatService = {
  /** GET /api/settings/cubo-chat */
  async get(): Promise<CuboChatSettings> {
    return mockDelay({
      baseUrl: "https://api.cubo.chat",
      connected: true,
      maskedToken: "••••5678",
      hasWebhookSecret: true,
      lastTestAt: new Date().toISOString(),
    });
  },

  /** POST /api/settings/cubo-chat */
  async save(input: {
    baseUrl: string;
    token?: string;
    webhookSecret?: string;
  }): Promise<SecureStatus> {
    void input;
    return mockDelay({
      connected: true,
      maskedKey: "••••5678",
      lastTestAt: new Date().toISOString(),
    });
  },

  /** POST /api/settings/cubo-chat/test */
  async test(): Promise<SecureStatus> {
    return mockDelay({
      connected: true,
      lastTestAt: new Date().toISOString(),
    });
  },
};
