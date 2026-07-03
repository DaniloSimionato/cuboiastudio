import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  PrismaClient,
  Status,
  type Assistant,
  type Company,
  type Permission,
  type Role,
  type User,
} from "@prisma/client";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const candidateEnvFiles = [
  path.resolve(scriptDir, "..", ".env"),
  path.resolve(scriptDir, "..", "..", "..", ".env"),
];

function parseEnvFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const content = fs.readFileSync(filePath, "utf8");
  const entries: Record<string, string> = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    entries[key] = value;
  }

  return entries;
}

function loadDatabaseUrl(): string {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  for (const filePath of candidateEnvFiles) {
    const env = parseEnvFile(filePath);

    if (env.DATABASE_URL) {
      process.env.DATABASE_URL = env.DATABASE_URL;
      return env.DATABASE_URL;
    }
  }

  return "";
}

const databaseUrl = loadDatabaseUrl();

if (!databaseUrl) {
  console.error("DATABASE_URL is not set. Skipping development seed.");
  process.exit(1);
}

const prisma = new PrismaClient({
  log: ["error", "warn"],
});

const DEMO_IDS = {
  company: "company_demo_cubo_ai_studio",
  user: "user_demo_cubo_ai_studio",
  assistant: "assistant_demo_cubo_ai_studio",
  roles: {
    admin: "role_admin_cubo_ai_studio",
    implantation: "role_implantation_cubo_ai_studio",
    support: "role_support_cubo_ai_studio",
    viewer: "role_viewer_cubo_ai_studio",
  },
} as const;

const PERMISSIONS = [
  "assistants:read",
  "assistants:write",
  "knowledge:read",
  "knowledge:write",
  "tools:read",
  "tools:write",
  "channels:read",
  "channels:write",
  "logs:read",
  "usage:read",
  "settings:read",
  "settings:write",
] as const;

const ROLE_PERMISSION_MAP: Record<string, readonly string[]> = {
  admin: PERMISSIONS,
  implantation: [
    "assistants:read",
    "assistants:write",
    "knowledge:read",
    "knowledge:write",
    "tools:read",
    "tools:write",
    "channels:read",
    "channels:write",
    "logs:read",
    "usage:read",
    "settings:read",
    "settings:write",
  ],
  support: [
    "assistants:read",
    "knowledge:read",
    "tools:read",
    "channels:read",
    "logs:read",
    "usage:read",
    "settings:read",
  ],
  viewer: [
    "assistants:read",
    "knowledge:read",
    "tools:read",
    "channels:read",
    "logs:read",
    "usage:read",
    "settings:read",
  ],
};

type SeedRoleKey = keyof typeof DEMO_IDS.roles;

async function ensureCompany(): Promise<Company> {
  const existingCompany = await prisma.company.findUnique({
    where: { id: DEMO_IDS.company },
  });

  if (existingCompany) {
    return prisma.company.update({
      where: { id: DEMO_IDS.company },
      data: {
        name: "Cubo AI Studio Demo",
        document: null,
        status: Status.ACTIVE,
      },
    });
  }

  return prisma.company.create({
    data: {
      id: DEMO_IDS.company,
      name: "Cubo AI Studio Demo",
      document: null,
      status: Status.ACTIVE,
    },
  });
}

async function ensurePermissions(): Promise<Permission[]> {
  const records: Permission[] = [];

  for (const key of PERMISSIONS) {
    const record = await prisma.permission.upsert({
      where: { key },
      update: {
        description: `${key} permission for Cubo AI Studio development seed`,
      },
      create: {
        key,
        description: `${key} permission for Cubo AI Studio development seed`,
      },
    });

    records.push(record);
  }

  return records;
}

async function ensureRoles(companyId: string): Promise<Record<SeedRoleKey, Role>> {
  const roles = await Promise.all(
    Object.entries(DEMO_IDS.roles).map(async ([roleKey, roleId]) => {
      const role = await prisma.role.upsert({
        where: {
          id: roleId,
        },
        update: {
          companyId,
          name: roleKey,
          description: `${roleKey} role for development seed`,
        },
        create: {
          id: roleId,
          companyId,
          name: roleKey,
          description: `${roleKey} role for development seed`,
        },
      });

      return [roleKey, role] as const;
    }),
  );

  return Object.fromEntries(roles) as Record<SeedRoleKey, Role>;
}

async function ensureRolePermissions(
  roles: Record<SeedRoleKey, Role>,
  permissions: Permission[],
): Promise<void> {
  const permissionByKey = new Map(permissions.map((permission) => [permission.key, permission]));

  for (const [roleKey, permissionKeys] of Object.entries(ROLE_PERMISSION_MAP)) {
    const role = roles[roleKey as SeedRoleKey];

    for (const permissionKey of permissionKeys) {
      const permission = permissionByKey.get(permissionKey);

      if (!permission) {
        throw new Error(`Missing permission during seed: ${permissionKey}`);
      }

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: permission.id,
        },
      });
    }
  }
}

async function ensureUser(companyId: string, roles: Record<SeedRoleKey, Role>): Promise<User> {
  const existingUser = await prisma.user.findUnique({
    where: {
      id: DEMO_IDS.user,
    },
  });

  const userData = {
    companyId,
    name: "Demo Admin",
    email: "demo@cubo.chat",
    status: Status.ACTIVE,
  };

  const user = existingUser
    ? await prisma.user.update({
        where: { id: DEMO_IDS.user },
        data: userData,
      })
    : await prisma.user.create({
        data: {
          id: DEMO_IDS.user,
          ...userData,
        },
      });

  const adminRole = roles.admin;

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: user.id,
        roleId: adminRole.id,
      },
    },
    update: {},
    create: {
      userId: user.id,
      roleId: adminRole.id,
    },
  });

  return user;
}

async function ensureAssistant(companyId: string): Promise<Assistant> {
  return prisma.assistant.upsert({
    where: {
      id: DEMO_IDS.assistant,
    },
    update: {
      companyId,
      name: "Assistente Demo",
      description: "Assistente inicial para validacao do modulo de Assistentes IA.",
      status: Status.ACTIVE,
    },
    create: {
      id: DEMO_IDS.assistant,
      companyId,
      name: "Assistente Demo",
      description: "Assistente inicial para validacao do modulo de Assistentes IA.",
      status: Status.ACTIVE,
    },
  });
}

async function ensureGoogleCalendarApp(): Promise<void> {
  await prisma.app.upsert({
    where: {
      slug: "google_calendar",
    },
    update: {
      name: "Google Agenda",
      description:
        "Conecte agendas Google para permitir que a IA consulte horários, crie reservas, remarque e cancele eventos.",
      status: Status.ACTIVE,
    },
    create: {
      slug: "google_calendar",
      name: "Google Agenda",
      description:
        "Conecte agendas Google para permitir que a IA consulte horários, crie reservas, remarque e cancele eventos.",
      status: Status.ACTIVE,
    },
  });
}

async function main(): Promise<void> {
  const company = await ensureCompany();
  const permissions = await ensurePermissions();
  const roles = await ensureRoles(company.id);
  await ensureRolePermissions(roles, permissions);
  await ensureUser(company.id, roles);
  await ensureAssistant(company.id);
  await ensureGoogleCalendarApp();

  console.log("Development RBAC seed completed.");
  console.log(`Company: ${company.id}`);
  console.log(`User: ${DEMO_IDS.user}`);
  console.log(`Assistant: ${DEMO_IDS.assistant}`);
  console.log("App catalog: google_calendar");
  console.log(`Roles: ${Object.values(DEMO_IDS.roles).join(", ")}`);
}

main()
  .catch(async (error: unknown) => {
    console.error("Development RBAC seed failed.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => undefined);
  });
