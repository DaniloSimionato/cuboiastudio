import type {
  Agent,
  Channel,
  Cliente,
  ConversationLog,
  KnowledgeBase,
  Memory,
  Tool,
  Variable,
} from "@/types";

export const clientes: Cliente[] = [];

export const agentes: Agent[] = [];

export const bases: KnowledgeBase[] = [];

export const ferramentas: Tool[] = [];

export const canais: Channel[] = [];

export const logs: ConversationLog[] = [];

export const memorias: Memory[] = [];

export const variaveis: Variable[] = [];

export const clienteNome = (id: string) => clientes.find((c) => c.id === id)?.nome ?? "-";
export const agenteNome = (id: string) => agentes.find((a) => a.id === id)?.nome ?? "-";
