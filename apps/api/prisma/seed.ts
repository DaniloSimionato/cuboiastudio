import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  PrismaClient,
  Status,
  type Assistant,
  type CompanyMembership,
  type Company,
  type Permission,
  type Role,
  type User,
} from "@prisma/client";
import {
  DEFAULT_COMPANY_ROLE_PERMISSION_MAP,
  RBAC_PERMISSIONS,
} from "../dist/auth/rbac.defaults.js";

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

  for (const key of RBAC_PERMISSIONS) {
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

  for (const [roleKey, permissionKeys] of Object.entries(DEFAULT_COMPANY_ROLE_PERMISSION_MAP)) {
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
    activeCompanyId: companyId,
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

async function ensureMembership(userId: string, companyId: string): Promise<CompanyMembership> {
  return prisma.companyMembership.upsert({
    where: {
      userId_companyId: {
        userId,
        companyId,
      },
    },
    update: {
      status: Status.ACTIVE,
    },
    create: {
      userId,
      companyId,
      status: Status.ACTIVE,
    },
  });
}

async function ensureStudioAdmin(userId: string, permissions: Permission[]): Promise<void> {
  const role = await prisma.role.upsert({
    where: { id: "role_studio_admin" },
    update: { companyId: null, name: "studio_admin" },
    create: {
      id: "role_studio_admin",
      companyId: null,
      name: "studio_admin",
      description: "Global Studio administrator",
    },
  });

  for (const permissionKey of ["users:manage", "companies:manage"]) {
    const permission = permissions.find((item) => item.key === permissionKey);
    if (!permission) {
      throw new Error(`Missing global permission during seed: ${permissionKey}`);
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

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId, roleId: role.id } },
    update: {},
    create: { userId, roleId: role.id },
  });
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

const COMING_SOON_APPS = [
  { slug: "webhook", name: "Webhook", description: "Envie e receba eventos em tempo real via gatilhos customizados.", category: "Automação", icon: "webhook" },
  { slug: "google_sheets", name: "Google Sheets", description: "Escreva e leia linhas em planilhas para sincronizar dados automaticamente.", category: "Dados e Planilhas", icon: "spreadsheet" },
  { slug: "google_docs", name: "Google Docs", description: "Crie relatórios, contratos e documentos dinâmicos pela IA.", category: "Agenda e Produtividade", icon: "file-text" },
  { slug: "gmail", name: "Gmail", description: "Envie emails, crie rascunhos e faça buscas na sua caixa de entrada.", category: "Comunicação", icon: "mail" },
  { slug: "google_drive", name: "Google Drive", description: "Armazene e gerencie arquivos e pastas gerados pelo Cubo.", category: "Agenda e Produtividade", icon: "hard-drive" },
  { slug: "mercado_livre", name: "Mercado Livre", description: "Consulte perguntas, vendas e atualize anúncios no marketplace.", category: "Marketplaces", icon: "shopping-bag" },
  { slug: "olx", name: "OLX", description: "Integre anúncios e chats do portal diretamente no Cubo.", category: "Marketplaces", icon: "shopping-cart" },
  { slug: "shopee", name: "Shopee", description: "Monitore pedidos, estoque e responda chats de clientes Shopee.", category: "Marketplaces", icon: "store" },
  { slug: "chatwoot", name: "Chatwoot", description: "Sincronize conversas multicanal e conecte agentes humanos.", category: "Comunicação", icon: "message-square" },
  { slug: "whatsapp_business", name: "WhatsApp Business API", description: "Envie mensagens ativas e faça atendimento pelo canal mais usado.", category: "Comunicação", icon: "message-circle" },
  { slug: "instagram", name: "Instagram Direct", description: "Responda mensagens diretas, comentários e stories automaticamente.", category: "Comunicação", icon: "instagram" },
  { slug: "facebook_messenger", name: "Facebook Messenger", description: "Responda chats da sua página de forma centralizada.", category: "Comunicação", icon: "message-circle" },
  { slug: "make", name: "Make (Integromat)", description: "Conecte fluxos complexos e milhares de aplicativos sem código.", category: "Automação", icon: "git-pull-request" },
  { slug: "zapier", name: "Zapier", description: "Envie triggers e consuma Zaps para integrar sua operação.", category: "Automação", icon: "zap" },
  { slug: "notion", name: "Notion", description: "Consulte páginas, adicione linhas a databases e crie notas rápidas.", category: "Agenda e Produtividade", icon: "book-open" },
  { slug: "hubspot", name: "HubSpot", description: "Crie contatos, negócios e atualize deals no funil de vendas.", category: "CRM e Vendas", icon: "users" },
  { slug: "rd_station", name: "RD Station", description: "Envie leads gerados pela IA direto para fluxos de marketing.", category: "CRM e Vendas", icon: "target" },
  { slug: "pipedrive", name: "Pipedrive", description: "Crie pessoas, organizações e deals para seu time comercial.", category: "CRM e Vendas", icon: "inbox" },
  { slug: "trello", name: "Trello", description: "Crie cards, mova listas e organize demandas visuais por quadros.", category: "Agenda e Produtividade", icon: "trello" },
  { slug: "asana", name: "Asana", description: "Cadastre tarefas e colabore em projetos ágeis no Asana.", category: "Agenda e Produtividade", icon: "activity" },
  { slug: "slack", name: "Slack", description: "Envie notificações, interaja em canais e faça alertas internos.", category: "Comunicação", icon: "message-square" },
  { slug: "discord", name: "Discord", description: "Envie mensagens via webhooks para servidores Discord.", category: "Comunicação", icon: "message-square" }
];

async function ensureGoogleCalendarApp(): Promise<void> {
  await prisma.app.upsert({
    where: {
      slug: "google_calendar",
    },
    update: {
      name: "Google Agenda",
      description:
        "Conecte agendas Google para permitir que a IA consulte horários, crie reservas, remarque e cancele eventos.",
      category: "Agenda e Produtividade",
      icon: "calendar",
      availability: "AVAILABLE",
      status: Status.ACTIVE,
      isFeatured: true,
    },
    create: {
      slug: "google_calendar",
      name: "Google Agenda",
      description:
        "Conecte agendas Google para permitir que a IA consulte horários, crie reservas, remarque e cancele eventos.",
      category: "Agenda e Produtividade",
      icon: "calendar",
      availability: "AVAILABLE",
      status: Status.ACTIVE,
      isFeatured: true,
    },
  });
}

async function ensureComingSoonApps(): Promise<void> {
  for (const app of COMING_SOON_APPS) {
    await prisma.app.upsert({
      where: { slug: app.slug },
      update: {
        name: app.name,
        description: app.description,
        category: app.category,
        icon: app.icon,
        availability: "COMING_SOON",
        status: Status.ACTIVE,
      },
      create: {
        slug: app.slug,
        name: app.name,
        description: app.description,
        category: app.category,
        icon: app.icon,
        availability: "COMING_SOON",
        status: Status.ACTIVE,
      },
    });
  }
}

async function ensureDefaultClassifications(companyId: string): Promise<void> {
  const types = [
    { slug: "quadra", name: "Quadra", description: "Quadra esportiva para locação", sortOrder: 0 },
    { slug: "sala", name: "Sala", description: "Sala de reuniões, aulas ou atendimento", sortOrder: 1 },
    { slug: "profissional", name: "Profissional", description: "Profissional prestador de serviços", sortOrder: 2 },
    { slug: "recurso", name: "Recurso", description: "Recurso ou equipamento geral", sortOrder: 3 },
  ];
  for (const t of types) {
    await prisma.reservableResourceType.upsert({
      where: { companyId_slug: { companyId, slug: t.slug } },
      update: { name: t.name, description: t.description, sortOrder: t.sortOrder, active: true },
      create: { companyId, slug: t.slug, name: t.name, description: t.description, sortOrder: t.sortOrder, active: true },
    });
  }

  const categories = [
    { slug: "geral", name: "Geral", description: "Categoria geral de serviços", sortOrder: 0 },
    { slug: "beach-tennis", name: "Beach Tennis", description: "Treino ou locação de Beach Tennis", sortOrder: 1 },
    { slug: "padel", name: "Padel", description: "Treino ou locação de Padel", sortOrder: 2 },
  ];
  for (const c of categories) {
    await prisma.reservableResourceCategory.upsert({
      where: { companyId_slug: { companyId, slug: c.slug } },
      update: { name: c.name, description: c.description, sortOrder: c.sortOrder, active: true },
      create: { companyId, slug: c.slug, name: c.name, description: c.description, sortOrder: c.sortOrder, active: true },
    });
  }

  const attributes = [
    { slug: "padrao", name: "Padrão", description: "Ambiente ou característica padrão", sortOrder: 0 },
    { slug: "aberta", name: "Aberta", description: "Instalação ao ar livre", sortOrder: 1 },
    { slug: "coberta", name: "Coberta", description: "Instalação coberta / protegida", sortOrder: 2 },
  ];
  for (const a of attributes) {
    await prisma.reservableResourceAttribute.upsert({
      where: { companyId_slug: { companyId, slug: a.slug } },
      update: { name: a.name, description: a.description, sortOrder: a.sortOrder, active: true },
      create: { companyId, slug: a.slug, name: a.name, description: a.description, sortOrder: a.sortOrder, active: true },
    });
  }
}

async function main(): Promise<void> {
  const company = await ensureCompany();
  const permissions = await ensurePermissions();
  const roles = await ensureRoles(company.id);
  await ensureRolePermissions(roles, permissions);
  const user = await ensureUser(company.id, roles);
  await ensureMembership(user.id, company.id);
  await ensureStudioAdmin(user.id, permissions);
  await ensureAssistant(company.id);
  await ensureGoogleCalendarApp();
  await ensureComingSoonApps();
  await ensureDefaultClassifications(company.id);

  console.log("Development RBAC seed completed.");
  console.log(`Company: ${company.id}`);
  console.log(`User: ${DEMO_IDS.user}`);
  console.log(`Assistant: ${DEMO_IDS.assistant}`);
  console.log("App catalog: google_calendar + 22 coming soon apps");
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
