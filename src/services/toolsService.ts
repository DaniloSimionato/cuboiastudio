/**
 * toolsService — gerencia ferramentas/webhooks via /api/tools.
 * 🔐 Tokens de autenticação de webhooks são enviados ao backend e
 * jamais retornados em claro pelo GET.
 */
import type { Tool } from "@/types";
import { mockDelay } from "./apiClient";

export const toolsService = {
  /** GET /api/tools */
  async list(): Promise<Tool[]> {
    return mockDelay([]);
  },
  /** POST /api/tools  |  PUT /api/tools/:id */
  async save(input: Partial<Tool> & { authToken?: string }): Promise<Tool> {
    // O backend criptografa `authToken` e devolve a ferramenta sem o segredo.
    const { authToken: _omit, ...rest } = input;
    void _omit;
    return mockDelay({ ...(rest as Tool), hasStoredSecret: true });
  },
  /** POST /api/tools/:id/test */
  async test(id: string): Promise<{ ok: boolean; ms: number }> {
    void id;
    return mockDelay({ ok: true, ms: 432 });
  },
};
