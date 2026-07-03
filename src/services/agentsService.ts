/** agentsService — /api/agents. Sem segredos no payload. */
import type { Agent } from "@/types";
import { agentes } from "@/data/mock";
import { mockDelay } from "./apiClient";

export const agentsService = {
  list: () => mockDelay(agentes as Agent[]),
  get: (id: string) => mockDelay((agentes as Agent[]).find((a) => a.id === id) ?? null),
  save: (input: Partial<Agent>) => mockDelay({ ...(input as Agent) }),
  publish: (id: string) => mockDelay({ ok: true, id }),
};
