import {
  requestedPriceServiceKeys,
  type RagPriceServiceKey,
} from "./rag-price-authority";

export const PRICE_CONTINUITY_SCHEMA_VERSION = "PRICE_CONTINUITY_V1";

export type ActivePriceService = Exclude<RagPriceServiceKey, "unknown">;

export type PriceContinuityState = Readonly<{
  schemaVersion: typeof PRICE_CONTINUITY_SCHEMA_VERSION;
  activeIntent: "price";
  activeService: ActivePriceService;
  sourceTurnExecutionId: string;
  contextVersion: number;
  controlRevision: number;
  recordedAt: string;
  establishedBy: "EXPLICIT_PRICE_REQUEST" | "INHERITED_PRICE_SERVICE_FOLLOW_UP";
  inheritedFromTurnExecutionId: string | null;
}>;

export type PriceIntentResolution = Readonly<{
  effectivePriceIntent: boolean;
  currentService: ActivePriceService | null;
  source: "EXPLICIT" | "INHERITED" | "NONE";
  previousState: PriceContinuityState | null;
}>;

const ACTIVE_PRICE_SERVICES = new Set<ActivePriceService>([
  "formatacao",
  "placa_mae",
  "remocao_virus",
  "recuperacao_dados",
  "montagem_computadores",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isActivePriceService(value: unknown): value is ActivePriceService {
  return typeof value === "string" && ACTIVE_PRICE_SERVICES.has(value as ActivePriceService);
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function isEllipticalPriceServiceFollowUp(message: string): boolean {
  return /^e\s+(?:para|pra)\b/u.test(normalize(message));
}

export function parsePriceContinuityState(value: unknown): PriceContinuityState | null {
  if (
    !isRecord(value) ||
    value.schemaVersion !== PRICE_CONTINUITY_SCHEMA_VERSION ||
    value.activeIntent !== "price" ||
    !isActivePriceService(value.activeService) ||
    typeof value.sourceTurnExecutionId !== "string" ||
    !/^turn_v1_[a-f0-9]{32}$/.test(value.sourceTurnExecutionId) ||
    typeof value.contextVersion !== "number" ||
    !Number.isSafeInteger(value.contextVersion) ||
    value.contextVersion < 1 ||
    typeof value.controlRevision !== "number" ||
    !Number.isSafeInteger(value.controlRevision) ||
    value.controlRevision < 0 ||
    typeof value.recordedAt !== "string" ||
    !Number.isFinite(Date.parse(value.recordedAt)) ||
    (value.establishedBy !== "EXPLICIT_PRICE_REQUEST" &&
      value.establishedBy !== "INHERITED_PRICE_SERVICE_FOLLOW_UP") ||
    (value.inheritedFromTurnExecutionId !== null &&
      (typeof value.inheritedFromTurnExecutionId !== "string" ||
        !/^turn_v1_[a-f0-9]{32}$/.test(value.inheritedFromTurnExecutionId)))
  ) {
    return null;
  }

  return {
    schemaVersion: PRICE_CONTINUITY_SCHEMA_VERSION,
    activeIntent: "price",
    activeService: value.activeService,
    sourceTurnExecutionId: value.sourceTurnExecutionId,
    contextVersion: value.contextVersion,
    controlRevision: value.controlRevision,
    recordedAt: value.recordedAt,
    establishedBy: value.establishedBy,
    inheritedFromTurnExecutionId: value.inheritedFromTurnExecutionId,
  };
}

export function resolvePriceIntent(input: {
  message: string;
  explicitPriceIntent: boolean;
  inheritanceAllowed: boolean;
  previousState: PriceContinuityState | null;
  contextVersion: number;
  controlRevision: number;
}): PriceIntentResolution {
  const requestedServices = requestedPriceServiceKeys(input.message).filter(
    (service): service is ActivePriceService => service !== "unknown",
  );
  const currentService = requestedServices.length === 1 ? requestedServices[0] : null;

  if (input.explicitPriceIntent) {
    return {
      effectivePriceIntent: true,
      currentService,
      source: "EXPLICIT",
      previousState: input.previousState,
    };
  }

  const previousStateIsCurrent =
    input.previousState?.contextVersion === input.contextVersion &&
    input.previousState.controlRevision === input.controlRevision;
  if (
    !input.inheritanceAllowed ||
    !previousStateIsCurrent ||
    !currentService ||
    !isEllipticalPriceServiceFollowUp(input.message)
  ) {
    return {
      effectivePriceIntent: false,
      currentService,
      source: "NONE",
      previousState: input.previousState,
    };
  }

  return {
    effectivePriceIntent: true,
    currentService,
    source: "INHERITED",
    previousState: input.previousState,
  };
}

export function createPriceContinuityState(input: {
  serviceKey: RagPriceServiceKey;
  turnExecutionId: string;
  contextVersion: number;
  controlRevision: number;
  recordedAt: string;
  source: PriceIntentResolution["source"];
  previousState: PriceContinuityState | null;
}): PriceContinuityState {
  if (
    !isActivePriceService(input.serviceKey) ||
    (input.source !== "EXPLICIT" && input.source !== "INHERITED")
  ) {
    throw new Error("PRICE_CONTINUITY_UNRESOLVED_SERVICE");
  }

  return {
    schemaVersion: PRICE_CONTINUITY_SCHEMA_VERSION,
    activeIntent: "price",
    activeService: input.serviceKey,
    sourceTurnExecutionId: input.turnExecutionId,
    contextVersion: input.contextVersion,
    controlRevision: input.controlRevision,
    recordedAt: input.recordedAt,
    establishedBy:
      input.source === "INHERITED"
        ? "INHERITED_PRICE_SERVICE_FOLLOW_UP"
        : "EXPLICIT_PRICE_REQUEST",
    inheritedFromTurnExecutionId:
      input.source === "INHERITED" ? input.previousState?.sourceTurnExecutionId ?? null : null,
  };
}
