/**
 * aiProviderService
 *
 * 🔐 Frontend NUNCA chama OpenAI/Anthropic/Gemini/OpenRouter diretamente.
 * Toda credencial é enviada ao backend em /api/settings/ai-provider,
 * que criptografa em repouso e devolve apenas estado mascarado.
 */
import type { AIProviderSettings, SecureStatus } from "@/types";
import { mockDelay } from "./apiClient";

export const aiProviderService = {
  /** GET /api/settings/ai-provider */
  async get(): Promise<AIProviderSettings> {
    return mockDelay({
      provider: "openai",
      model: "gpt-4o-mini",
      temperature: 0.4,
      maxTokens: 1024,
      connected: true,
      maskedKey: "sk-••••1234",
      lastTestAt: new Date().toISOString(),
    });
  },

  /**
   * POST /api/settings/ai-provider
   * O backend recebe a apiKey, criptografa e descarta o valor em claro.
   * O frontend deve limpar a variável local logo após o envio.
   */
  async save(input: {
    provider: AIProviderSettings["provider"];
    model: string;
    apiKey?: string; // opcional: omitir mantém a chave atual
    temperature: number;
    maxTokens: number;
  }): Promise<SecureStatus> {
    void input;
    return mockDelay({
      connected: true,
      maskedKey: "sk-••••1234",
      lastTestAt: new Date().toISOString(),
    });
  },

  /** POST /api/settings/ai-provider/test */
  async test(): Promise<SecureStatus> {
    return mockDelay({
      connected: true,
      lastTestAt: new Date().toISOString(),
      message: "Conexão verificada pelo backend.",
    });
  },
};
