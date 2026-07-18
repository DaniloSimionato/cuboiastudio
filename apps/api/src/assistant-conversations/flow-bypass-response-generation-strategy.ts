import type { AssistantFlow } from "@prisma/client";

type FlowBypassCache = {
  set(key: string, value: null, ttlSeconds: number): Promise<unknown>;
};

type FlowBypassLogger = {
  warn(message: string): unknown;
};

export type FlowBypassResponseGenerationInput = {
  flow: AssistantFlow | null | undefined;
  triageCacheKey: string;
  cache?: FlowBypassCache;
  logger: FlowBypassLogger;
};

export type FlowBypassResponseGenerationResult =
  | { kind: "NONE" }
  | {
      kind: "FIXED_MESSAGE";
      answer: string;
      finalAction: string;
      autoRespond: boolean;
      providerCallCount: 0;
      handoffPending: false;
      outcome: "success";
    }
  | {
      kind: "HANDOFF";
      answer: string;
      finalAction: string;
      autoRespond: boolean;
      providerCallCount: 0;
      handoffPending: true;
      outcome: "handoff";
    };

export function requiresFlowBypassGeneration(flow: AssistantFlow | null | undefined): boolean {
  if (!flow) return false;

  const finalAction = flow.finalAction || "respond";
  return (
    finalAction === "fixed_message" ||
    finalAction === "handoff" ||
    flow.requiresHuman ||
    flow.autoRespond === false
  );
}

export async function generateFlowBypassResponse(
  input: FlowBypassResponseGenerationInput,
): Promise<FlowBypassResponseGenerationResult> {
  if (!requiresFlowBypassGeneration(input.flow)) return { kind: "NONE" };

  const finalAction = input.flow!.finalAction || "respond";
  const autoRespond = input.flow!.autoRespond !== false;
  if (finalAction === "fixed_message") {
    return {
      kind: "FIXED_MESSAGE",
      answer: input.flow!.fixedMessage || "Agradecemos o contato.",
      finalAction,
      autoRespond,
      providerCallCount: 0,
      handoffPending: false,
      outcome: "success",
    };
  }

  if (input.cache) {
    try {
      await input.cache.set(input.triageCacheKey, null, 1);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      input.logger.warn(`Failed to clear triage cache on handoff: ${message}`);
    }
  }

  return {
    kind: "HANDOFF",
    answer: "Transferindo para um atendente...",
    finalAction,
    autoRespond,
    providerCallCount: 0,
    handoffPending: true,
    outcome: "handoff",
  };
}
