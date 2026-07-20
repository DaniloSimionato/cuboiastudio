import {
  type ExplicitCustomerRequestKey,
  type MultiIntentTurn,
  normalizeIntentText,
} from "../intent-router/intent-routing";
import {
  buildStructuredBusinessAnswer,
  type OfficialBusinessContext,
} from "../assistants/official-business-context";

export type MultiIntentResponseCoverage = {
  coveredRequests: ExplicitCustomerRequestKey[];
  unresolvedRequests: ExplicitCustomerRequestKey[];
  addedAcknowledgements: ExplicitCustomerRequestKey[];
};

function coversRequest(answer: string, request: ExplicitCustomerRequestKey): boolean {
  const text = normalizeIntentText(answer);
  switch (request) {
    case "technical_support":
      return /\b(?:notebook|computador|equipamento|nao esta ligando|nao liga|problema tecnico|avaliacao tecnica)\b/.test(
        text,
      );
    case "pickup_delivery":
      return /\b(?:coleta|retirada|retirar|buscar|busca|entrega)\b/.test(text);
    case "business_hours":
      return /\b(?:horario|atendemos|abremos|abre|fecha|segunda|sabado|domingo)\b/.test(text);
    case "pricing":
      return /\b(?:preco|valor|orcamento|confirmar)\b/.test(text);
    case "warranty":
      return /\bgarantia\b/.test(text);
  }
}

function acknowledgementFor(
  request: ExplicitCustomerRequestKey,
  input: { currentMessage: string; officialBusinessContext: OfficialBusinessContext | null },
): string | null {
  switch (request) {
    case "technical_support":
      return "Entendi que seu notebook não está ligando.";
    case "pickup_delivery":
      return "Sobre a coleta, preciso confirmar se a retirada está disponível para esse atendimento.";
    case "business_hours":
      return (
        buildStructuredBusinessAnswer(input.currentMessage, input.officialBusinessContext)
          ?.answer ?? null
      );
    case "pricing":
      return "Sobre valores, preciso confirmar a informação antes de passar qualquer preço.";
    case "warranty":
      return "Sobre a garantia, preciso confirmar as condições aplicáveis a esse atendimento.";
  }
}

/**
 * Keeps one provider and one selected flow while making a buffered turn's
 * explicit requests visible in the final response. The additions are factual
 * acknowledgements only: they never create a second flow, provider call, or
 * outbound operation.
 */
export function ensureMultiIntentResponseCoverage(input: {
  answer: string;
  turn: MultiIntentTurn;
  currentMessage: string;
  officialBusinessContext: OfficialBusinessContext | null;
}): { answer: string; coverage: MultiIntentResponseCoverage } {
  const explicitRequests = input.turn.explicitRequests;
  const initialCovered = explicitRequests.filter((request) => coversRequest(input.answer, request));
  const missing = explicitRequests.filter((request) => !initialCovered.includes(request));
  const acknowledgements = missing
    .map((request) => ({ request, text: acknowledgementFor(request, input) }))
    .filter((item): item is { request: ExplicitCustomerRequestKey; text: string } =>
      Boolean(item.text),
    );
  const answer = acknowledgements.length
    ? `${acknowledgements.map((item) => item.text).join(" ")} ${input.answer.trim()}`.trim()
    : input.answer;
  const coveredRequests = explicitRequests.filter((request) => coversRequest(answer, request));

  return {
    answer,
    coverage: {
      coveredRequests,
      unresolvedRequests: explicitRequests.filter((request) => !coveredRequests.includes(request)),
      addedAcknowledgements: acknowledgements.map((item) => item.request),
    },
  };
}
