const RealDate = globalThis.Date;
const MOCK_TIME = new RealDate("2026-07-04T00:00:00.000Z").getTime();
class MockDate extends RealDate {
  constructor(...args) {
    if (args.length === 0) {
      super(MOCK_TIME);
    } else {
      super(...args);
    }
  }
}
MockDate.now = () => MOCK_TIME;
globalThis.Date = MockDate;

import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { test } from "node:test";
import { Prisma } from "@prisma/client";
import { AppsService } from "../dist/apps/apps.service.js";
import { GoogleCalendarClientService } from "../dist/apps/google-calendar/google-calendar-client.service.js";
import { GoogleCalendarOAuthService } from "../dist/apps/google-calendar/google-calendar-oauth.service.js";
import { GoogleCalendarAvailabilityService } from "../dist/apps/google-calendar/google-calendar-availability.service.js";
import { GoogleCalendarBookingService } from "../dist/apps/google-calendar/google-calendar-booking.service.js";
import { CalendarToolsService } from "../dist/apps/calendar-tools.service.js";

const now = new Date("2026-01-01T12:00:00.000Z");
const encryptionKey = randomBytes(32).toString("hex");

function createAuth(companyId = "company-1") {
  return {
    user: {
      id: `user-${companyId}`,
      companyId,
      email: `${companyId}@example.com`,
      name: "Test User",
      roles: [],
      permissions: ["tools:read", "tools:write"],
    },
    tenant: { companyId },
  };
}

function createConfig(overrides = {}) {
  const values = {
    GOOGLE_CLIENT_ID: "google-client-id",
    GOOGLE_CLIENT_SECRET: "google-client-secret",
    GOOGLE_CALENDAR_REDIRECT_URI: "http://localhost:3001/apps/google-calendar/oauth/callback",
    APP_ENCRYPTION_KEY: encryptionKey,
    CORS_ORIGIN: "http://localhost:5173",
    ...overrides,
  };

  return {
    get: (key) => values[key],
  };
}

function createJsonResponse(payload, ok = true, status = ok ? 200 : 400) {
  return {
    ok,
    status,
    json: async () => payload,
  };
}

function createGoogleFetch(overrides = {}) {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    const rawUrl = String(url);

    if (rawUrl.includes("oauth2.googleapis.com/token")) {
      if (typeof overrides.token === "function") {
        return overrides.token(url, init);
      }

      return createJsonResponse({
        access_token: "google-access-token",
        refresh_token: "google-refresh-token",
        expires_in: 3600,
        scope:
          "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.freebusy https://www.googleapis.com/auth/calendar.readonly",
        token_type: "Bearer",
      });
    }

    if (rawUrl.includes("googleapis.com/calendar/v3/users/me/calendarList")) {
      if (typeof overrides.calendarList === "function") {
        return overrides.calendarList(url, init);
      }

      return createJsonResponse({
        items: [
          {
            id: "primary@example.com",
            summary: "Principal",
            timeZone: "America/Campo_Grande",
            accessRole: "owner",
            primary: true,
            selected: true,
          },
          {
            id: "quadra-1@example.com",
            summary: "Quadra de Beach Aberta 1",
            description: "Agenda da quadra",
            timeZone: "America/Campo_Grande",
            accessRole: "writer",
            selected: true,
          },
        ],
      });
    }

    if (rawUrl.includes("oauth2.googleapis.com/revoke")) {
      return createJsonResponse({});
    }

    if (rawUrl.includes("googleapis.com/calendar/v3/freeBusy")) {
      if (typeof overrides.freeBusy === "function") {
        return overrides.freeBusy(url, init);
      }
      return createJsonResponse({
        calendars: {
          "primary@example.com": { busy: [] },
          "quadra-1@example.com": { busy: [] }
        }
      });
    }

    if (rawUrl.match(/googleapis\.com\/calendar\/v3\/calendars\/[^/]+\/events$/)) {
      if (typeof overrides.createEvent === "function") {
        return overrides.createEvent(url, init);
      }
      return createJsonResponse({
        id: `google-event-${calls.length}`,
      });
    }

    if (rawUrl.match(/googleapis\.com\/calendar\/v3\/calendars\/[^/]+\/events\/[^/]+$/)) {
      if (init.method === "DELETE") {
        if (typeof overrides.deleteEvent === "function") {
          return overrides.deleteEvent(url, init);
        }
        return createJsonResponse({}, true, 204);
      }
      if (init.method === "PATCH") {
        if (typeof overrides.patchEvent === "function") {
          return overrides.patchEvent(url, init);
        }
        return createJsonResponse({ id: "patched-event-id" });
      }
    }

    return createJsonResponse({ error: "unexpected_url" }, false, 404);
  };

  return { fetchImpl, calls };
}

function createMockPrisma() {
  const state = {
    apps: [
      {
        id: "app-google-calendar",
        slug: "google_calendar",
        name: "Google Agenda",
        description:
          "Conecte agendas Google para permitir que a IA consulte horários, crie reservas, remarque e cancele eventos.",
        status: "ACTIVE",
        availability: "AVAILABLE",
        metadata: null,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "app-webhook",
        slug: "webhook",
        name: "Webhook",
        description: "Webhook integration",
        status: "ACTIVE",
        availability: "COMING_SOON",
        metadata: null,
        createdAt: now,
        updatedAt: now,
      },
    ],
    installations: [],
    credentials: [],
    resources: [],
    bookings: [],
    logs: [],
    types: [],
    categories: [],
    attributes: [],
  };

  function shapeInstallation(installation) {
    const app = state.apps.find((item) => item.id === installation.appId);
    const credentials = state.credentials.filter(
      (credential) => credential.installationId === installation.id,
    );

    return {
      id: installation.id,
      companyId: installation.companyId,
      appId: installation.appId,
      status: installation.status,
      lastErrorCode: installation.lastErrorCode ?? null,
      lastErrorMessage: installation.lastErrorMessage ?? null,
      metadata: installation.metadata ?? null,
      createdAt: installation.createdAt,
      updatedAt: installation.updatedAt,
      app,
      credentials,
    };
  }

  function shapeBooking(booking) {
    const resource = state.resources.find((item) => item.id === booking.resourceId) || {
      id: booking.resourceId,
      name: "Resource Mock",
      calendarId: "mock-calendar@example.com",
      timezone: "America/Campo_Grande",
    };
    return {
      ...booking,
      resource: {
        id: resource.id,
        name: resource.name,
        calendarId: resource.calendarId,
        timezone: resource.timezone,
      },
    };
  }

  function shapeResource(resource) {
    if (!resource) return null;
    const resourceTypeRef = state.types.find(t => t.id === resource.resourceTypeId) || null;
    const categoryRef = state.categories.find(c => c.id === resource.categoryId) || null;
    const attributeRef = state.attributes.find(a => a.id === resource.attributeId) || null;
    const inst = state.installations.find(i => i.id === resource.installationId) || null;
    return {
      ...resource,
      resourceTypeRef,
      categoryRef,
      attributeRef,
      installation: inst ? { appId: inst.appId } : { appId: "google_calendar" },
    };
  }

  function sortDescByUpdatedAt(items) {
    return [...items].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  const prisma = {
    $transaction: async (callback) => callback(prisma),
    app: {
      findMany: async ({ where }) =>
        state.apps.filter((app) => !where?.status || app.status === where.status),
      findUnique: async ({ where }) =>
        state.apps.find((app) => app.slug === where.slug || app.id === where.id) ?? null,
    },
    appInstallation: {
      findMany: async ({ where }) =>
        state.installations
          .filter((installation) => installation.companyId === where.companyId)
          .map(shapeInstallation),
      findUnique: async ({ where }) => {
        const input = where.companyId_appId;
        const installation =
          state.installations.find(
            (item) => item.companyId === input.companyId && item.appId === input.appId,
          ) ?? null;
        return installation ? shapeInstallation(installation) : null;
      },
      findFirst: async ({ where }) => {
        const found = state.installations.find(
          (item) =>
            (!where.id || item.id === where.id) &&
            (!where.companyId || item.companyId === where.companyId) &&
            (!where.appId || item.appId === where.appId),
        );
        return found ? shapeInstallation(found) : null;
      },
      create: async ({ data }) => {
        const installation = {
          id: `installation-${state.installations.length + 1}`,
          ...data,
          lastErrorCode: null,
          lastErrorMessage: null,
          metadata: null,
          createdAt: now,
          updatedAt: now,
        };
        state.installations.push(installation);
        return shapeInstallation(installation);
      },
      upsert: async ({ where, update, create }) => {
        const input = where.companyId_appId;
        let installation = state.installations.find(
          (item) => item.companyId === input.companyId && item.appId === input.appId,
        );

        if (installation) {
          Object.assign(installation, update, { updatedAt: now });
        } else {
          installation = {
            id: `installation-${state.installations.length + 1}`,
            ...create,
            lastErrorCode: null,
            lastErrorMessage: null,
            metadata: null,
            createdAt: now,
            updatedAt: now,
          };
          state.installations.push(installation);
        }

        return shapeInstallation(installation);
      },
      update: async ({ where, data }) => {
        const installation = state.installations.find((item) => item.id === where.id);
        Object.assign(installation, data, { updatedAt: now });
        return shapeInstallation(installation);
      },
      delete: async ({ where }) => {
        const idx = state.installations.findIndex((item) => item.id === where.id);
        if (idx === -1) throw new Error("Installation not found");
        const deleted = state.installations.splice(idx, 1)[0];
        return shapeInstallation(deleted);
      },
    },
    appCredential: {
      findFirst: async ({ where }) =>
        sortDescByUpdatedAt(
          state.credentials.filter(
            (credential) =>
              (!where.companyId || credential.companyId === where.companyId) &&
              (!where.installationId || 
                (typeof where.installationId === "object" && where.installationId.in
                  ? where.installationId.in.includes(credential.installationId)
                  : credential.installationId === where.installationId)) &&
              (!where.provider || credential.provider === where.provider) &&
              (!where.status || credential.status === where.status),
          ),
        )[0] ?? null,
      create: async ({ data }) => {
        const credential = {
          id: `credential-${state.credentials.length + 1}`,
          createdAt: now,
          updatedAt: now,
          ...data,
        };
        state.credentials.push(credential);
        return credential;
      },
      update: async ({ where, data }) => {
        const credential = state.credentials.find((item) => item.id === where.id);
        Object.assign(credential, data, { updatedAt: now });
        return credential;
      },
      updateMany: async ({ where, data }) => {
        let count = 0;
        for (const credential of state.credentials) {
          const notId = where.id?.not;
          if (
            (!where.companyId || credential.companyId === where.companyId) &&
            (!where.installationId || credential.installationId === where.installationId) &&
            (!where.provider || credential.provider === where.provider) &&
            (!where.status || credential.status === where.status) &&
            (!notId || credential.id !== notId)
          ) {
            Object.assign(credential, data, { updatedAt: now });
            count += 1;
          }
        }
        return { count };
      },
    },
    googleCalendarResource: {
      findMany: async ({ where }) =>
        state.resources
          .filter(
            (resource) =>
              (!where.companyId || resource.companyId === where.companyId) &&
              (!where.installationId || resource.installationId === where.installationId) &&
              (!where.active || resource.active === where.active),
          )
          .map(shapeResource),
      findFirst: async ({ where }) => {
        const found = state.resources.find(
          (resource) =>
            (!where.id || resource.id === where.id) &&
            (!where.companyId || resource.companyId === where.companyId) &&
            (!where.installationId || resource.installationId === where.installationId) &&
            (!where.calendarId || resource.calendarId === where.calendarId) &&
            (!where.active || resource.active === where.active),
        );
        return found ? shapeResource(found) : null;
      },
      create: async ({ data }) => {
        const resource = {
          id: `resource-${state.resources.length + 1}`,
          metadata: null,
          createdAt: now,
          updatedAt: now,
          ...data,
        };
        state.resources.push(resource);
        return shapeResource(resource);
      },
      update: async ({ where, data }) => {
        const resource = state.resources.find((item) => item.id === where.id);
        Object.assign(resource, data, { updatedAt: now });
        return shapeResource(resource);
      },
      updateMany: async ({ where, data }) => {
        let count = 0;
        for (const resource of state.resources) {
          if (
            (!where.companyId || resource.companyId === where.companyId) &&
            (!where.installationId || resource.installationId === where.installationId)
          ) {
            Object.assign(resource, data, { updatedAt: now });
            count += 1;
          }
        }
        return { count };
      },
      count: async ({ where }) => {
        let items = state.resources;
        if (where) {
          if (where.resourceTypeId) {
            items = items.filter(r => r.resourceTypeId === where.resourceTypeId);
          }
          if (where.categoryId) {
            items = items.filter(r => r.categoryId === where.categoryId);
          }
          if (where.attributeId) {
            items = items.filter(r => r.attributeId === where.attributeId);
          }
        }
        return items.length;
      },
    },
    reservableResourceType: {
      findMany: async ({ where }) =>
        state.types.filter((t) => t.companyId === where.companyId),
      findFirst: async ({ where }) =>
        state.types.find(
          (t) =>
            (!where.id || t.id === where.id) &&
            (!where.companyId || t.companyId === where.companyId)
        ) ?? null,
      create: async ({ data }) => {
        const duplicated = state.types.some(t => t.companyId === data.companyId && t.slug === data.slug);
        if (duplicated) {
          throw new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
            code: "P2002",
            clientVersion: "mock",
          });
        }
        const created = {
          id: `type-${state.types.length + 1}`,
          createdAt: now,
          updatedAt: now,
          active: true,
          sortOrder: 0,
          ...data,
        };
        state.types.push(created);
        return created;
      },
      update: async ({ where, data }) => {
        const found = state.types.find((t) => t.id === where.id);
        Object.assign(found, data, { updatedAt: now });
        return found;
      },
      delete: async ({ where }) => {
        state.types = state.types.filter((t) => t.id !== where.id);
        return { id: where.id };
      },
    },
    reservableResourceCategory: {
      findMany: async ({ where }) =>
        state.categories.filter((c) => c.companyId === where.companyId),
      findFirst: async ({ where }) =>
        state.categories.find(
          (c) =>
            (!where.id || c.id === where.id) &&
            (!where.companyId || c.companyId === where.companyId)
        ) ?? null,
      create: async ({ data }) => {
        const duplicated = state.categories.some(c => c.companyId === data.companyId && c.slug === data.slug);
        if (duplicated) {
          throw new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
            code: "P2002",
            clientVersion: "mock",
          });
        }
        const created = {
          id: `cat-${state.categories.length + 1}`,
          createdAt: now,
          updatedAt: now,
          active: true,
          sortOrder: 0,
          ...data,
        };
        state.categories.push(created);
        return created;
      },
      update: async ({ where, data }) => {
        const found = state.categories.find((c) => c.id === where.id);
        Object.assign(found, data, { updatedAt: now });
        return found;
      },
      delete: async ({ where }) => {
        state.categories = state.categories.filter((c) => c.id !== where.id);
        return { id: where.id };
      },
    },
    reservableResourceAttribute: {
      findMany: async ({ where }) =>
        state.attributes.filter((a) => a.companyId === where.companyId),
      findFirst: async ({ where }) =>
        state.attributes.find(
          (a) =>
            (!where.id || a.id === where.id) &&
            (!where.companyId || a.companyId === where.companyId)
        ) ?? null,
      create: async ({ data }) => {
        const duplicated = state.attributes.some(a => a.companyId === data.companyId && a.slug === data.slug);
        if (duplicated) {
          throw new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
            code: "P2002",
            clientVersion: "mock",
          });
        }
        const created = {
          id: `attr-${state.attributes.length + 1}`,
          createdAt: now,
          updatedAt: now,
          active: true,
          sortOrder: 0,
          ...data,
        };
        state.attributes.push(created);
        return created;
      },
      update: async ({ where, data }) => {
        const found = state.attributes.find((a) => a.id === where.id);
        Object.assign(found, data, { updatedAt: now });
        return found;
      },
      delete: async ({ where }) => {
        state.attributes = state.attributes.filter((a) => a.id !== where.id);
        return { id: where.id };
      },
    },
    googleCalendarBooking: {
      findMany: async ({ where }) => {
        let items = state.bookings;
        if (where) {
          if (where.companyId) {
            items = items.filter((b) => b.companyId === where.companyId);
          }
          if (where.resourceId) {
            if (where.resourceId.in) {
              items = items.filter((b) => where.resourceId.in.includes(b.resourceId));
            } else {
              items = items.filter((b) => b.resourceId === where.resourceId);
            }
          }
          if (where.status) {
            if (where.status.in) {
              items = items.filter((b) => where.status.in.includes(b.status));
            } else {
              items = items.filter((b) => b.status === where.status);
            }
          }
          if (where.contactPhoneNormalized) {
            items = items.filter((b) => b.contactPhoneNormalized === where.contactPhoneNormalized);
          }
          if (where.id) {
            if (where.id.not) {
              items = items.filter((b) => b.id !== where.id.not);
            } else {
              items = items.filter((b) => b.id === where.id);
            }
          }
          if (where.startAt) {
            if (where.startAt.lt) {
              items = items.filter((b) => b.startAt < where.startAt.lt);
            }
            if (where.startAt.gte) {
              items = items.filter((b) => b.startAt >= where.startAt.gte);
            }
          }
          if (where.endAt) {
            if (where.endAt.gt) {
              items = items.filter((b) => b.endAt > where.endAt.gt);
            }
          }
        }
        return items.map(shapeBooking);
      },
      findFirst: async ({ where }) => {
        let items = state.bookings;
        if (where) {
          if (where.id) {
            items = items.filter((b) => b.id === where.id);
          }
          if (where.companyId) {
            items = items.filter((b) => b.companyId === where.companyId);
          }
          if (where.idempotencyKey) {
            items = items.filter((b) => b.idempotencyKey === where.idempotencyKey);
          }
          if (where.status) {
            items = items.filter((b) => b.status === where.status);
          }
        }
        return items.length > 0 ? shapeBooking(items[0]) : null;
      },
      create: async ({ data }) => {
        const booking = {
          id: `booking-${state.bookings.length + 1}`,
          createdAt: now,
          updatedAt: now,
          ...data,
        };
        state.bookings.push(booking);
        return shapeBooking(booking);
      },
      update: async ({ where, data }) => {
        const booking = state.bookings.find((item) => item.id === where.id);
        if (!booking) throw new Error("Booking not found in mock Prisma update");
        Object.assign(booking, data, { updatedAt: now });
        return shapeBooking(booking);
      },
    },
    appActionLog: {
      create: async ({ data }) => {
        state.logs.push({ id: `log-${state.logs.length + 1}`, ...data, createdAt: now });
        return state.logs.at(-1);
      },
      deleteMany: async ({ where }) => {
        state.logs = state.logs.filter((l) => l.installationId !== where.installationId);
        return { count: 0 };
      },
    },
  };

  return { prisma, state };
}

async function connectGoogle({ prisma, fetchImpl, companyId = "company-1" }) {
  const oauth = new GoogleCalendarOAuthService(prisma, createConfig(), fetchImpl);
  const url = await oauth.buildAuthorizationUrl({
    companyId,
    userId: `user-${companyId}`,
  });
  const state = new URL(url).searchParams.get("state");
  await oauth.handleCallback({ code: "valid-code", state });
  return oauth;
}

test("lista apps disponíveis no catálogo sem instalar automaticamente", async () => {
  const { prisma } = createMockPrisma();
  const service = new AppsService(prisma);
  const auth = createAuth();

  const response = await service.findAllApps(auth);

  assert.equal(response.items.length, 2);
  assert.equal(response.items[0].slug, "google_calendar");
  assert.equal(response.items[0].installation, null);
});

test("instala Google Agenda e lista instalações do tenant", async () => {
  const { prisma } = createMockPrisma();
  const service = new AppsService(prisma);
  const auth = createAuth();

  const installation = await service.installApp({ ...auth, slug: "google_calendar" });
  const installations = await service.findAllInstallations(auth);

  assert.equal(installation.status, "ACTIVE");
  assert.equal(installations.items.length, 1);
  assert.equal(installations.items[0].app.slug, "google_calendar");
});

test("cria recurso Google Calendar vinculado à instalação ativa", async () => {
  const { prisma } = createMockPrisma();
  const service = new AppsService(prisma);
  const auth = createAuth();

  await service.installApp({ ...auth, slug: "google_calendar" });
  const resource = await service.createGoogleCalendarResource({
    ...auth,
    dto: {
      name: "Quadra de Beach Aberta 1",
      calendarId: "calendar-1@example.com",
      resourceType: "quadra",
      sportType: "beach_tennis",
      isCovered: false,
      timezone: "America/Campo_Grande",
      slotMinutes: 30,
      defaultDurationMinutes: 60,
      minAdvanceMinutes: 60,
      maxDaysAhead: 14,
      active: true,
    },
  });

  assert.equal(resource.name, "Quadra de Beach Aberta 1");
  assert.equal(resource.calendarId, "calendar-1@example.com");
});

test("isola instalações e recursos por tenant", async () => {
  const { prisma } = createMockPrisma();
  const service = new AppsService(prisma);
  const companyOne = createAuth("company-1");
  const companyTwo = createAuth("company-2");

  await service.installApp({ ...companyOne, slug: "google_calendar" });
  await service.createGoogleCalendarResource({
    ...companyOne,
    dto: {
      name: "Quadra de Padel Coberta 1",
      calendarId: "calendar-private@example.com",
      resourceType: "quadra",
      sportType: "padel",
    },
  });

  const companyTwoInstallations = await service.findAllInstallations(companyTwo);
  const companyTwoResources = await service.findGoogleCalendarResources(companyTwo);

  assert.equal(companyTwoInstallations.items.length, 0);
  assert.equal(companyTwoResources.items.length, 0);
});

test("não expõe dados sensíveis nas respostas de instalação", async () => {
  const { prisma, state } = createMockPrisma();
  const service = new AppsService(prisma);
  const auth = createAuth();

  const installation = await service.installApp({ ...auth, slug: "google_calendar" });
  state.credentials.push({
    id: "credential-1",
    companyId: auth.tenant.companyId,
    installationId: installation.id,
    provider: "google",
    status: "ACTIVE",
    providerAccountEmail: "agenda@example.com",
    expiresAt: now,
    encryptedAccessToken: "secret-access-token",
    encryptedRefreshToken: "secret-refresh-token",
    createdAt: now,
    updatedAt: now,
  });

  const response = await service.findAllInstallations(auth);
  const serialized = JSON.stringify(response);

  assert.equal(response.items[0].credentialsConfigured, true);
  assert.equal(response.items[0].providerAccountEmail, "agenda@example.com");
  assert.doesNotMatch(serialized, /encryptedAccessToken|encryptedRefreshToken|secret-access-token/);
});

test("iniciar OAuth sem env configurada retorna erro seguro", async () => {
  const { prisma } = createMockPrisma();
  const { fetchImpl } = createGoogleFetch();
  const oauth = new GoogleCalendarOAuthService(
    prisma,
    createConfig({ GOOGLE_CLIENT_ID: "", GOOGLE_CLIENT_SECRET: "" }),
    fetchImpl,
  );

  await assert.rejects(
    () => oauth.buildAuthorizationUrl({ companyId: "company-1", userId: "user-1" }),
    /Google Agenda OAuth is not configured/,
  );
});

test("iniciar OAuth com env configurada retorna URL válida", async () => {
  const { prisma } = createMockPrisma();
  const { fetchImpl } = createGoogleFetch();
  const oauth = new GoogleCalendarOAuthService(prisma, createConfig(), fetchImpl);

  const url = await oauth.buildAuthorizationUrl({ companyId: "company-1", userId: "user-1" });
  const parsed = new URL(url);

  assert.equal(parsed.origin, "https://accounts.google.com");
  assert.equal(parsed.searchParams.get("client_id"), "google-client-id");
  assert.equal(parsed.searchParams.get("access_type"), "offline");
  assert.match(parsed.searchParams.get("scope"), /calendar\.events/);
});

test("callback com state inválido falha", async () => {
  const { prisma } = createMockPrisma();
  const { fetchImpl } = createGoogleFetch();
  const oauth = new GoogleCalendarOAuthService(prisma, createConfig(), fetchImpl);

  await assert.rejects(
    () => oauth.handleCallback({ code: "valid-code", state: "invalid-state" }),
    /Invalid Google OAuth state/,
  );
});

test("callback com state válido salva credencial criptografada", async () => {
  const { prisma, state } = createMockPrisma();
  const { fetchImpl } = createGoogleFetch();
  await connectGoogle({ prisma, fetchImpl });

  assert.equal(state.credentials.length, 1);
  assert.equal(state.credentials[0].providerAccountEmail, "primary@example.com");
  assert.notEqual(state.credentials[0].encryptedAccessToken, "google-access-token");
  assert.notEqual(state.credentials[0].encryptedRefreshToken, "google-refresh-token");
  assert.equal(state.installations[0].status, "ACTIVE");
});

test("status OAuth não retorna tokens", async () => {
  const { prisma } = createMockPrisma();
  const { fetchImpl } = createGoogleFetch();
  const oauth = await connectGoogle({ prisma, fetchImpl });

  const status = await oauth.getStatus("company-1");
  const serialized = JSON.stringify(status);

  assert.equal(status.connected, true);
  assert.equal(status.providerAccountEmail, "primary@example.com");
  assert.doesNotMatch(serialized, /access_token|refresh_token|google-access-token|google-refresh-token/);
});

test("listar agendas exige credencial conectada", async () => {
  const { prisma } = createMockPrisma();
  const { fetchImpl } = createGoogleFetch();
  const oauth = new GoogleCalendarOAuthService(prisma, createConfig(), fetchImpl);
  const client = new GoogleCalendarClientService(prisma, oauth, fetchImpl);

  await assert.rejects(() => client.listCalendars("company-1"), /Install Google Agenda|not connected/);
});

test("listar agendas não retorna tokens e indica agenda mapeada", async () => {
  const { prisma } = createMockPrisma();
  const { fetchImpl } = createGoogleFetch();
  const oauth = await connectGoogle({ prisma, fetchImpl });
  const client = new GoogleCalendarClientService(prisma, oauth, fetchImpl);
  await client.createResourceFromCalendar({
    companyId: "company-1",
    dto: {
      calendarId: "quadra-1@example.com",
      name: "Quadra 1",
      resourceType: "quadra",
      sportType: "beach_tennis",
    },
  });

  const response = await client.listCalendars("company-1");
  const serialized = JSON.stringify(response);

  assert.equal(response.items.length, 2);
  assert.equal(response.items.find((item) => item.id === "quadra-1@example.com").mapped, true);
  assert.doesNotMatch(serialized, /google-access-token|google-refresh-token|client_secret/);
});

test("OAuth e agendas respeitam isolamento por tenant", async () => {
  const { prisma } = createMockPrisma();
  const { fetchImpl } = createGoogleFetch();
  const oauth = await connectGoogle({ prisma, fetchImpl, companyId: "company-1" });
  const client = new GoogleCalendarClientService(prisma, oauth, fetchImpl);

  const companyOne = await client.listCalendars("company-1");
  await assert.rejects(() => client.listCalendars("company-2"), /Install Google Agenda|not connected/);

  assert.equal(companyOne.items.length, 2);
});

test("criação de recurso a partir de agenda real respeita companyId", async () => {
  const { prisma } = createMockPrisma();
  const { fetchImpl } = createGoogleFetch();
  const oauth = await connectGoogle({ prisma, fetchImpl, companyId: "company-1" });
  const client = new GoogleCalendarClientService(prisma, oauth, fetchImpl);

  await client.createResourceFromCalendar({
    companyId: "company-1",
    dto: {
      calendarId: "quadra-1@example.com",
      name: "Quadra de Beach Aberta 1",
      resourceType: "quadra",
      sportType: "beach_tennis",
    },
  });

  const otherTenantResources = await prisma.googleCalendarResource.findMany({
    where: { companyId: "company-2" },
  });

  assert.equal(otherTenantResources.length, 0);
});

test("desconectar não apaga logs e não expõe tokens", async () => {
  const { prisma, state } = createMockPrisma();
  const { fetchImpl } = createGoogleFetch();
  const oauth = await connectGoogle({ prisma, fetchImpl });
  const logsBeforeDisconnect = state.logs.length;

  const status = await oauth.disconnect({ companyId: "company-1" });
  const serialized = JSON.stringify({ status, logs: state.logs });

  assert.equal(status.connected, false);
  assert.equal(state.logs.length, logsBeforeDisconnect + 1);
  assert.equal(state.credentials[0].status, "INACTIVE");
  assert.doesNotMatch(serialized, /google-access-token|google-refresh-token/);
});

async function setupAvailabilityEnv({ companyId = "company-1" } = {}) {
  const { prisma, state } = createMockPrisma();
  const { fetchImpl, calls } = createGoogleFetch();
  const oauth = await connectGoogle({ prisma, fetchImpl, companyId });

  // create resource
  const client = new GoogleCalendarClientService(prisma, oauth, fetchImpl);
  const resource = await client.createResourceFromCalendar({
    companyId,
    dto: {
      calendarId: "quadra-1@example.com",
      name: "Quadra 1",
      resourceType: "quadra",
      sportType: "beach_tennis",
      slotMinutes: 30,
      defaultDurationMinutes: 60,
      minAdvanceMinutes: 60,
      maxDaysAhead: 14,
      active: true,
    },
  });

  const availabilityService = new GoogleCalendarAvailabilityService(prisma, oauth, fetchImpl);
  const bookingService = new GoogleCalendarBookingService(prisma, oauth, availabilityService, fetchImpl);
  const toolsService = new CalendarToolsService(availabilityService, bookingService);

  return { prisma, state, fetchImpl, calls, oauth, client, resource, availabilityService, bookingService, toolsService };
}

test("consultar disponibilidade com recursos ativos", async () => {
  const env = await setupAvailabilityEnv();
  const res = await env.availabilityService.checkAvailability({
    companyId: "company-1",
    dto: {
      date: "2026-07-04",
      timeFrom: "09:00",
      timeTo: "11:00",
      durationMinutes: 60,
    },
  });

  assert.equal(res.available, true);
  assert.ok(res.options.length > 0);
  assert.equal(res.options[0].resourceId, env.resource.id);
  assert.equal(res.options[0].resourceName, "Quadra 1");
});

test("consultar disponibilidade sem app conectado", async () => {
  const { prisma } = createMockPrisma();
  const { fetchImpl } = createGoogleFetch();
  const oauth = new GoogleCalendarOAuthService(prisma, createConfig(), fetchImpl);
  const availabilityService = new GoogleCalendarAvailabilityService(prisma, oauth, fetchImpl);

  await assert.rejects(
    () => availabilityService.checkAvailability({
      companyId: "company-1",
      dto: {
        date: "2026-07-04",
        timeFrom: "09:00",
        timeTo: "11:00",
      },
    }),
    /Google Agenda is not connected|Install Google Agenda/,
  );
});

test("consultar disponibilidade sem recurso ativo", async () => {
  const env = await setupAvailabilityEnv();
  // Desativa o recurso
  await env.prisma.googleCalendarResource.update({
    where: { id: env.resource.id },
    data: { active: false },
  });

  const res = await env.availabilityService.checkAvailability({
    companyId: "company-1",
    dto: {
      date: "2026-07-04",
      timeFrom: "09:00",
      timeTo: "11:00",
    },
  });

  assert.equal(res.available, false);
  assert.equal(res.options.length, 0);
});

test("respeitar minAdvanceMinutes", async () => {
  const env = await setupAvailabilityEnv();
  
  // Usamos o dia de amanhã para evitar problemas de fuso horário/virada de dia
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const dateStr = tomorrow.toISOString().slice(0, 10);
  
  // Definimos minAdvanceMinutes para 48 horas (2880 minutos)
  await env.prisma.googleCalendarResource.update({
    where: { id: env.resource.id },
    data: { minAdvanceMinutes: 2880 },
  });

  // Amanhã (24h de antecedência) < 48h de antecedência -> deve ser descartado
  const res1 = await env.availabilityService.checkAvailability({
    companyId: "company-1",
    dto: {
      date: dateStr,
      timeFrom: "00:00",
      timeTo: "23:59",
      durationMinutes: 60,
    },
  });
  const tomorrowOptions = res1.options.filter(opt => opt.startAt.startsWith(dateStr));
  assert.equal(tomorrowOptions.length, 0);

  // Daqui a 3 dias (72h de antecedência) > 48h de antecedência -> deve ser permitido
  const threeDaysAhead = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  const threeDaysAheadStr = threeDaysAhead.toISOString().slice(0, 10);
  const res2 = await env.availabilityService.checkAvailability({
    companyId: "company-1",
    dto: {
      date: threeDaysAheadStr,
      timeFrom: "00:00",
      timeTo: "23:59",
      durationMinutes: 60,
    },
  });
  const threeDaysAheadOptions = res2.options.filter(opt => opt.startAt.startsWith(threeDaysAheadStr));
  assert.ok(threeDaysAheadOptions.length > 0);
});

test("respeitar maxDaysAhead", async () => {
  const env = await setupAvailabilityEnv();
  await env.prisma.googleCalendarResource.update({
    where: { id: env.resource.id },
    data: { maxDaysAhead: 2 },
  });

  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);
  const res1 = await env.availabilityService.checkAvailability({
    companyId: "company-1",
    dto: {
      date: tomorrowStr,
      timeFrom: "09:00",
      timeTo: "11:00",
    },
  });
  assert.equal(res1.available, true);

  const fiveDaysAhead = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
  const fiveDaysAheadStr = fiveDaysAhead.toISOString().slice(0, 10);
  const res2 = await env.availabilityService.checkAvailability({
    companyId: "company-1",
    dto: {
      date: fiveDaysAheadStr,
      timeFrom: "09:00",
      timeTo: "11:00",
    },
  });
  assert.equal(res2.available, false);
});

test("não retornar eventos ocupados", async () => {
  const { prisma, fetchImpl } = await setupAvailabilityEnv();

  // Mock do FreeBusy retornando ocupado das 13:00 às 14:00 UTC
  const customFetch = createGoogleFetch({
    freeBusy: async () => createJsonResponse({
      calendars: {
        "quadra-1@example.com": {
          busy: [
            { start: "2026-07-04T13:00:00Z", end: "2026-07-04T14:00:00Z" }
          ]
        }
      }
    })
  }).fetchImpl;

  const oauth = await connectGoogle({ prisma, fetchImpl: customFetch });
  const availabilityServiceWithBusy = new GoogleCalendarAvailabilityService(prisma, oauth, customFetch);

  const res = await availabilityServiceWithBusy.checkAvailability({
    companyId: "company-1",
    dto: {
      date: "2026-07-04",
      timeFrom: "08:00",
      timeTo: "11:00", // local 08:00 (12:00 UTC) a 11:00 (15:00 UTC)
      durationMinutes: 60,
    },
  });

  assert.equal(res.available, true);
  
  // Filtra apenas opções do dia 2026-07-04 para evitar conflito com dias futuros gerados pela busca multi-dia
  const optionsOnTargetDay = res.options.filter(opt => opt.startAt.startsWith("2026-07-04"));
  const labels = optionsOnTargetDay.map(opt => opt.label);
  
  assert.ok(labels.some(l => l.includes("08:00")));
  assert.ok(labels.some(l => l.includes("10:00")));
  assert.ok(!labels.some(l => l.includes("09:00")));
});

test("criar reserva com horário disponível", async () => {
  const env = await setupAvailabilityEnv();
  const res = await env.bookingService.createBooking({
    companyId: "company-1",
    dto: {
      resourceId: env.resource.id,
      contactName: "Danilo",
      contactPhone: "67999999999",
      startAt: "2026-07-04T13:00:00.000Z",
      endAt: "2026-07-04T14:00:00.000Z",
      conversationId: "conv-1",
      notes: "Reserva de teste",
    },
  });

  assert.equal(res.success, true);
  assert.ok(res.bookingId);
  assert.ok(res.googleEventId);

  const stored = await env.prisma.googleCalendarBooking.findFirst({
    where: { id: res.bookingId },
  });
  assert.ok(stored);
  assert.equal(stored.contactName, "Danilo");
  assert.equal(stored.contactPhoneNormalized, "67999999999");
  assert.equal(stored.status, "CONFIRMED");
});

test("impedir reserva em horário ocupado", async () => {
  const env = await setupAvailabilityEnv();
  await env.bookingService.createBooking({
    companyId: "company-1",
    dto: {
      resourceId: env.resource.id,
      contactName: "Danilo",
      contactPhone: "67999999999",
      startAt: "2026-07-04T13:00:00.000Z",
      endAt: "2026-07-04T14:00:00.000Z",
      conversationId: "conv-1",
    },
  });

  await assert.rejects(
    () => env.bookingService.createBooking({
      companyId: "company-1",
      dto: {
        resourceId: env.resource.id,
        contactName: "Junior",
        contactPhone: "67888888888",
        startAt: "2026-07-04T13:00:00.000Z",
        endAt: "2026-07-04T14:00:00.000Z",
        conversationId: "conv-2",
      },
    }),
    /Requested time is not available/,
  );
});

test("impedir duplicidade por idempotencyKey", async () => {
  const env = await setupAvailabilityEnv();
  const res1 = await env.bookingService.createBooking({
    companyId: "company-1",
    dto: {
      resourceId: env.resource.id,
      contactName: "Danilo",
      contactPhone: "67999999999",
      startAt: "2026-07-04T13:00:00.000Z",
      endAt: "2026-07-04T14:00:00.000Z",
      conversationId: "conv-unique",
    },
  });

  const res2 = await env.bookingService.createBooking({
    companyId: "company-1",
    dto: {
      resourceId: env.resource.id,
      contactName: "Danilo",
      contactPhone: "67999999999",
      startAt: "2026-07-04T13:00:00.000Z",
      endAt: "2026-07-04T14:00:00.000Z",
      conversationId: "conv-unique",
    },
  });

  assert.equal(res1.bookingId, res2.bookingId);
  assert.equal(res1.googleEventId, res2.googleEventId);
  assert.equal(env.state.bookings.length, 1);
});

test("buscar reservas por contato", async () => {
  const env = await setupAvailabilityEnv();
  await env.bookingService.createBooking({
    companyId: "company-1",
    dto: {
      resourceId: env.resource.id,
      contactName: "Danilo",
      contactPhone: "+55 (67) 99999-9999",
      startAt: "2026-07-04T13:00:00.000Z",
      endAt: "2026-07-04T14:00:00.000Z",
    },
  });

  const res = await env.bookingService.findBookingsByContact({
    companyId: "company-1",
    query: {
      contactPhone: "5567999999999",
    },
  });

  assert.equal(res.bookings.length, 1);
  assert.equal(res.bookings[0].resourceName, "Quadra 1");
});

test("remarcar reserva para horário disponível", async () => {
  const env = await setupAvailabilityEnv();
  const booking = await env.bookingService.createBooking({
    companyId: "company-1",
    dto: {
      resourceId: env.resource.id,
      contactName: "Danilo",
      contactPhone: "67999999999",
      startAt: "2026-07-04T13:00:00.000Z",
      endAt: "2026-07-04T14:00:00.000Z",
    },
  });

  const res = await env.bookingService.rescheduleBooking({
    companyId: "company-1",
    bookingId: booking.bookingId,
    dto: {
      newStartAt: "2026-07-04T15:00:00.000Z",
      newEndAt: "2026-07-04T16:00:00.000Z",
      reason: "Mudança de planos",
    },
  });

  assert.equal(res.success, true);
  assert.equal(res.bookingId, booking.bookingId);
  assert.equal(res.newStartAt, "2026-07-04T15:00:00.000Z");

  const updated = await env.prisma.googleCalendarBooking.findFirst({
    where: { id: booking.bookingId },
  });
  assert.equal(updated.startAt.toISOString(), "2026-07-04T15:00:00.000Z");
});

test("impedir remarcação para horário ocupado", async () => {
  const env = await setupAvailabilityEnv();
  const booking1 = await env.bookingService.createBooking({
    companyId: "company-1",
    dto: {
      resourceId: env.resource.id,
      contactName: "Danilo",
      contactPhone: "67999999999",
      startAt: "2026-07-04T13:00:00.000Z",
      endAt: "2026-07-04T14:00:00.000Z",
    },
  });

  await env.bookingService.createBooking({
    companyId: "company-1",
    dto: {
      resourceId: env.resource.id,
      contactName: "Junior",
      contactPhone: "67888888888",
      startAt: "2026-07-04T15:00:00.000Z",
      endAt: "2026-07-04T16:00:00.000Z",
    },
  });

  await assert.rejects(
    () => env.bookingService.rescheduleBooking({
      companyId: "company-1",
      bookingId: booking1.bookingId,
      dto: {
        newStartAt: "2026-07-04T15:00:00.000Z",
        newEndAt: "2026-07-04T16:00:00.000Z",
      },
    }),
    /Requested time is not available/,
  );
});

test("cancelar reserva", async () => {
  const env = await setupAvailabilityEnv();
  const booking = await env.bookingService.createBooking({
    companyId: "company-1",
    dto: {
      resourceId: env.resource.id,
      contactName: "Danilo",
      contactPhone: "67999999999",
      startAt: "2026-07-04T13:00:00.000Z",
      endAt: "2026-07-04T14:00:00.000Z",
    },
  });

  const res = await env.bookingService.cancelBooking({
    companyId: "company-1",
    bookingId: booking.bookingId,
    dto: {
      reason: "Desistência",
    },
  });

  assert.equal(res.success, true);
  assert.equal(res.bookingId, booking.bookingId);
  assert.equal(res.status, "CANCELLED");

  const cancelled = await env.prisma.googleCalendarBooking.findFirst({
    where: { id: booking.bookingId },
  });
  assert.equal(cancelled.status, "CANCELLED");
  assert.ok(cancelled.cancelledAt);
});

test("impedir acesso cross-tenant a recurso", async () => {
  const env = await setupAvailabilityEnv();

  await connectGoogle({ prisma: env.prisma, fetchImpl: env.fetchImpl, companyId: "company-2" });

  await assert.rejects(
    () => env.bookingService.createBooking({
      companyId: "company-2",
      dto: {
        resourceId: env.resource.id,
        contactName: "Intruso",
        contactPhone: "67999999999",
        startAt: "2026-07-04T13:00:00.000Z",
        endAt: "2026-07-04T14:00:00.000Z",
      },
    }),
    /Calendar resource not found or inactive/,
  );
});

test("impedir acesso cross-tenant a booking", async () => {
  const env = await setupAvailabilityEnv();
  const booking = await env.bookingService.createBooking({
    companyId: "company-1",
    dto: {
      resourceId: env.resource.id,
      contactName: "Danilo",
      contactPhone: "67999999999",
      startAt: "2026-07-04T13:00:00.000Z",
      endAt: "2026-07-04T14:00:00.000Z",
    },
  });

  await connectGoogle({ prisma: env.prisma, fetchImpl: env.fetchImpl, companyId: "company-2" });

  await assert.rejects(
    () => env.bookingService.rescheduleBooking({
      companyId: "company-2",
      bookingId: booking.bookingId,
      dto: {
        newStartAt: "2026-07-04T15:00:00.000Z",
        newEndAt: "2026-07-04T16:00:00.000Z",
      },
    }),
    /Booking not found/,
  );

  await assert.rejects(
    () => env.bookingService.cancelBooking({
      companyId: "company-2",
      bookingId: booking.bookingId,
      dto: {},
    }),
    /Booking not found/,
  );
});

test("garantir que responses não retornam tokens", async () => {
  const env = await setupAvailabilityEnv();
  
  const availRes = await env.availabilityService.checkAvailability({
    companyId: "company-1",
    dto: {
      date: "2026-07-04",
      timeFrom: "09:00",
      timeTo: "11:00",
    },
  });
  assert.doesNotMatch(JSON.stringify(availRes), /google-access-token|google-refresh-token|client_secret/);

  const bookingRes = await env.bookingService.createBooking({
    companyId: "company-1",
    dto: {
      resourceId: env.resource.id,
      contactName: "Danilo",
      contactPhone: "67999999999",
      startAt: "2026-07-04T13:00:00.000Z",
      endAt: "2026-07-04T14:00:00.000Z",
    },
  });
  assert.doesNotMatch(JSON.stringify(bookingRes), /google-access-token|google-refresh-token|client_secret/);
});

test("garantir que logs não têm tokens", async () => {
  const env = await setupAvailabilityEnv();
  
  await env.bookingService.createBooking({
    companyId: "company-1",
    dto: {
      resourceId: env.resource.id,
      contactName: "Danilo",
      contactPhone: "67999999999",
      startAt: "2026-07-04T13:00:00.000Z",
      endAt: "2026-07-04T14:00:00.000Z",
    },
  });

  const serializedLogs = JSON.stringify(env.state.logs);
  assert.doesNotMatch(serializedLogs, /google-access-token|google-refresh-token/);
});

test("impedir instalacao de app coming soon", async () => {
  const env = await setupAvailabilityEnv();
  const appsService = new AppsService(env.prisma);
  // 'webhook' is seeded as COMING_SOON
  const auth = createAuth("company-1");

  await assert.rejects(
    () => appsService.installApp({
      slug: "webhook",
      user: auth.user,
      tenant: auth.tenant,
    }),
    /Este aplicativo ainda não está disponível para instalação/,
  );
});

test("CRUD de classificacoes de recurso", async () => {
  const env = await setupAvailabilityEnv();
  const appsService = new AppsService(env.prisma);
  const companyId = "company-1";

  // 1. Criar Tipo
  const type = await appsService.createResourceType(companyId, {
    name: "Quadra de Squash",
    slug: "squash",
    description: "Para jogos de squash",
  });
  assert.equal(type.name, "Quadra de Squash");
  assert.equal(type.slug, "squash");

  // 2. Duplicado deve falhar
  await assert.rejects(
    () => appsService.createResourceType(companyId, {
      name: "Outra de Squash",
      slug: "squash",
    }),
    /Já existe um tipo com este slug nesta empresa/,
  );

  // 3. Atualizar Tipo
  const updated = await appsService.updateResourceType(companyId, type.id, {
    name: "Squash Premium",
  });
  assert.equal(updated.name, "Squash Premium");

  // 4. Listar Tipos
  const list = await appsService.findResourceTypes(companyId);
  assert.ok(list.some(t => t.id === type.id));

  // 5. Deletar Tipo
  await appsService.deleteResourceType(companyId, type.id);
  const listAfter = await appsService.findResourceTypes(companyId);
  assert.ok(!listAfter.some(t => t.id === type.id));
});

test("Filtros de classificacoes na disponibilidade", async () => {
  const env = await setupAvailabilityEnv();
  const appsService = new AppsService(env.prisma);
  const companyId = "company-1";

  // Criar classificações
  const type = await appsService.createResourceType(companyId, { name: "Auditório", slug: "auditorio" });
  const category = await appsService.createResourceCategory(companyId, { name: "Palestra", slug: "palestra" });
  const attribute = await appsService.createResourceAttribute(companyId, { name: "Climatizado", slug: "climatizado" });

  // Associar ao recurso existente
  await env.prisma.googleCalendarResource.update({
    where: { id: env.resource.id },
    data: {
      resourceTypeId: type.id,
      categoryId: category.id,
      attributeId: attribute.id,
    },
  });

  // Check availability with old and new query filters
  const res1 = await env.availabilityService.checkAvailability({
    companyId,
    dto: {
      date: "2026-07-04",
      timeFrom: "09:00",
      timeTo: "11:00",
      sportType: "palestra", // matches category slug
    },
  });
  assert.equal(res1.available, true);

  const res2 = await env.availabilityService.checkAvailability({
    companyId,
    dto: {
      date: "2026-07-04",
      timeFrom: "09:00",
      timeTo: "11:00",
      resourceType: "Auditório", // matches type name
    },
  });
  assert.equal(res2.available, true);

  const resNotFound = await env.availabilityService.checkAvailability({
    companyId,
    dto: {
      date: "2026-07-04",
      timeFrom: "09:00",
      timeTo: "11:00",
      sportType: "futebol", // unmatched
    },
  });
  assert.equal(resNotFound.available, false);
});

test("suporte a múltiplas instalações e isolamento de configuração", async () => {
  const { prisma, oauth, fetchImpl } = await setupAvailabilityEnv();
  const service = new AppsService(prisma);
  const auth = {
    user: { companyId: "company-1", id: "user-1", email: "a@a.com", name: "User", roles: [], permissions: ["tools:write", "tools:read"] },
    tenant: { companyId: "company-1" },
  };

  // 1. Já existe uma instalação
  const initialInstallations = await service.findAllInstallations(auth);
  assert.ok(initialInstallations.items.length >= 1);

  // 2. Instalação adicional de Google Agenda deve criar uma NOVA instalação
  const newInstallation = await service.installApp({ ...auth, slug: "google_calendar" });
  assert.ok(newInstallation.id);
  assert.notEqual(newInstallation.id, initialInstallations.items[0].id);

  // 3. Meus Apps deve listar múltiplas instalações
  const updatedInstallations = await service.findAllInstallations(auth);
  const googleCalendarInsts = updatedInstallations.items.filter(i => i.app.slug === "google_calendar");
  assert.equal(googleCalendarInsts.length, 2);

  // 4. Buscar detalhes específicos de uma instalação via findOneApp
  const firstAppDetail = await service.findOneApp({ ...auth, slug: "google_calendar", installationId: initialInstallations.items[0].id });
  assert.equal(firstAppDetail.installation.id, initialInstallations.items[0].id);

  const secondAppDetail = await service.findOneApp({ ...auth, slug: "google_calendar", installationId: newInstallation.id });
  assert.equal(secondAppDetail.installation.id, newInstallation.id);
  assert.equal(secondAppDetail.installation.credentialsConfigured, false);

  // 5. OAuth start url usa installationId correto
  const config = createConfig();
  const oauthService = new GoogleCalendarOAuthService(prisma, config, fetchImpl);
  const startUrlRes = await oauthService.buildAuthorizationUrl({
    companyId: "company-1",
    userId: "user-1",
    redirectUri: "http://localhost:3000/callback",
    installationId: newInstallation.id,
  });
  assert.ok(startUrlRes);
  assert.match(startUrlRes, /state=/);

  // 6. Impedir cross-tenant lookup
  const crossTenantAuth = {
    user: { companyId: "company-2", id: "user-2", email: "b@b.com", name: "User 2", roles: [], permissions: ["tools:write", "tools:read"] },
    tenant: { companyId: "company-2" },
  };
  await assert.rejects(
    () => service.findOneApp({ ...crossTenantAuth, slug: "google_calendar", installationId: newInstallation.id }),
    /Google Agenda installation not found or cross-tenant access denied/
  );

  // 7. PATCH status inativa/reativa
  const updatedStatusInactive = await service.updateInstallationStatus({
    id: newInstallation.id,
    dto: { status: "INACTIVE" },
    user: auth.user,
    tenant: auth.tenant,
  });
  assert.equal(updatedStatusInactive.status, "INACTIVE");

  const updatedStatusActive = await service.updateInstallationStatus({
    id: newInstallation.id,
    dto: { status: "ACTIVE" },
    user: auth.user,
    tenant: auth.tenant,
  });
  assert.equal(updatedStatusActive.status, "ACTIVE");

  // 8. DELETE remove apenas instalação vazia
  const deleteRes = await service.deleteInstallation({
    id: newInstallation.id,
    user: auth.user,
    tenant: auth.tenant,
  });
  assert.equal(deleteRes.id, newInstallation.id);

  // A primeira instalação initialInstallations.items[0] tem credencial e recursos e não deve poder ser excluída
  await assert.rejects(
    () => service.deleteInstallation({
      id: initialInstallations.items[0].id,
      user: auth.user,
      tenant: auth.tenant,
    }),
    /Não é possível excluir/
  );
});

