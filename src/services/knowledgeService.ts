/** knowledgeService — /api/knowledge. Uploads passam por URL assinada do backend. */
import type { KnowledgeBase } from "@/types";
import { bases } from "@/data/mock";
import { mockDelay } from "./apiClient";

export const knowledgeService = {
  list: () => mockDelay(bases as KnowledgeBase[]),
  search: (q: string) => mockDelay({ query: q, hits: [] as string[] }),
};
