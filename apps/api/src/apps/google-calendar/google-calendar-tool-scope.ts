export type CalendarToolScope = {
  category?: string | null;
  sportType?: string | null;
  resourceType?: string | null;
  attribute?: string | null;
  durationMinutes?: number | null;
  isCovered?: boolean | null;
  resourceIds?: string[] | null;
  calendarIds?: string[] | null;
};

export type AssistantFlowToolContext = {
  calendar?: CalendarToolScope | null;
};

export type ScopedCalendarResource = {
  id: string;
  calendarId: string;
  sportType?: string | null;
  resourceType?: string | null;
  isCovered?: boolean | null;
  categoryRef?: { name?: string | null; slug?: string | null } | null;
  resourceTypeRef?: { name?: string | null; slug?: string | null } | null;
  attributeRef?: { name?: string | null; slug?: string | null } | null;
};

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeOptionalStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const items = value
    .map((item) => normalizeOptionalString(item))
    .filter((item): item is string => item !== null);

  return items.length > 0 ? items : null;
}

function normalizeOptionalBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function normalizeOptionalInteger(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    return null;
  }

  return value;
}

export function normalizeCalendarToolScope(value: unknown): CalendarToolScope | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const source = value as Record<string, unknown>;
  const scope: CalendarToolScope = {
    category: normalizeOptionalString(source.category),
    sportType: normalizeOptionalString(source.sportType),
    resourceType: normalizeOptionalString(source.resourceType),
    attribute: normalizeOptionalString(source.attribute),
    durationMinutes: normalizeOptionalInteger(source.durationMinutes),
    isCovered: normalizeOptionalBoolean(source.isCovered),
    resourceIds: normalizeOptionalStringArray(source.resourceIds),
    calendarIds: normalizeOptionalStringArray(source.calendarIds),
  };

  return hasCalendarToolScope(scope) ? scope : null;
}

export function normalizeAssistantFlowToolContext(value: unknown): AssistantFlowToolContext | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const source = value as Record<string, unknown>;
  const calendar = normalizeCalendarToolScope(source.calendar);
  if (!calendar) {
    return null;
  }

  return { calendar };
}

export function hasCalendarToolScope(
  scope: CalendarToolScope | null | undefined,
): scope is CalendarToolScope {
  if (!scope) {
    return false;
  }

  return Boolean(
    scope.category ||
    scope.sportType ||
    scope.resourceType ||
    scope.attribute ||
    scope.durationMinutes ||
    (scope.isCovered !== null && scope.isCovered !== undefined) ||
    scope.resourceIds?.length ||
    scope.calendarIds?.length,
  );
}

export function normalizeType(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function matchesFlexibleType(actual: string | null | undefined, expected: string): boolean {
  if (!actual) {
    return false;
  }

  const normalizedActual = normalizeType(actual);
  const normalizedExpected = normalizeType(expected);
  const aliases: Record<string, string[]> = {
    beach: ["beach", "beachtennis"],
    beachtennis: ["beach", "beachtennis"],
    court: ["court", "quadra"],
    quadra: ["court", "quadra"],
  };
  const accepted = aliases[normalizedExpected] ?? [normalizedExpected];

  return accepted.some(
    (value) =>
      normalizedActual === value ||
      normalizedActual.includes(value) ||
      value.includes(normalizedActual),
  );
}

function matchesCategory(resource: ScopedCalendarResource, expected: string): boolean {
  return (
    matchesFlexibleType(resource.sportType, expected) ||
    matchesFlexibleType(resource.categoryRef?.name, expected) ||
    matchesFlexibleType(resource.categoryRef?.slug, expected)
  );
}

function matchesResourceType(resource: ScopedCalendarResource, expected: string): boolean {
  return (
    matchesFlexibleType(resource.resourceType, expected) ||
    matchesFlexibleType(resource.resourceTypeRef?.name, expected) ||
    matchesFlexibleType(resource.resourceTypeRef?.slug, expected)
  );
}

function matchesAttribute(resource: ScopedCalendarResource, expected: string): boolean {
  const normalizedExpected = expected.toLowerCase();
  const actualAttrName = resource.attributeRef?.name?.toLowerCase() ?? "";
  const actualAttrSlug = resource.attributeRef?.slug?.toLowerCase() ?? "";

  if (normalizedExpected === "coberta" || normalizedExpected === "coberto") {
    return (
      resource.isCovered === true ||
      actualAttrName.includes("coberta") ||
      actualAttrSlug.includes("coberta")
    );
  }

  if (normalizedExpected === "aberta" || normalizedExpected === "aberto") {
    return (
      resource.isCovered === false ||
      actualAttrName.includes("aberta") ||
      actualAttrSlug.includes("aberta")
    );
  }

  return actualAttrName.includes(normalizedExpected) || actualAttrSlug.includes(normalizedExpected);
}

export function matchesCalendarToolScope(
  resource: ScopedCalendarResource,
  scope: CalendarToolScope | null | undefined,
): boolean {
  if (!hasCalendarToolScope(scope)) {
    return true;
  }

  if (scope.resourceIds?.length && !scope.resourceIds.includes(resource.id)) {
    return false;
  }

  if (scope.calendarIds?.length && !scope.calendarIds.includes(resource.calendarId)) {
    return false;
  }

  if (scope.category && !matchesCategory(resource, scope.category)) {
    return false;
  }

  if (scope.sportType && !matchesCategory(resource, scope.sportType)) {
    return false;
  }

  if (scope.resourceType && !matchesResourceType(resource, scope.resourceType)) {
    return false;
  }

  if (scope.attribute && !matchesAttribute(resource, scope.attribute)) {
    return false;
  }

  if (
    scope.isCovered !== null &&
    scope.isCovered !== undefined &&
    resource.isCovered !== scope.isCovered
  ) {
    return false;
  }

  return true;
}

export function filterResourcesByCalendarToolScope<T extends ScopedCalendarResource>(
  resources: T[],
  scope: CalendarToolScope | null | undefined,
): T[] {
  if (!hasCalendarToolScope(scope)) {
    return resources;
  }

  return resources.filter((resource) => matchesCalendarToolScope(resource, scope));
}
