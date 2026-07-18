import type { RuntimeV2ResponseExecutionApproval } from "../runtime-v2/response-execution-approval";
import type { ResponseExecutionTurn } from "./response-execution-envelope";

export type V2PrimaryResponseExecutorInput = {
  turn: ResponseExecutionTurn;
  generationId: string;
  approval: RuntimeV2ResponseExecutionApproval;
  signal?: AbortSignal;
};

export type V2PrimaryResponseExecutorResult = {
  responseText: string;
  providerMetadata?: { provider: string | null; model: string | null };
  category: "businessHours";
  authority: "OFFICIAL_CONTEXT";
  candidateStatus: "CANDIDATE_APPROVED";
  qualityGateResult: "APPROVED";
  outboundAllowed: true;
};

/** Test-only seam. No production provider implementation is registered in this phase. */
export interface V2PrimaryResponseExecutor {
  execute(input: V2PrimaryResponseExecutorInput): Promise<V2PrimaryResponseExecutorResult>;
}
