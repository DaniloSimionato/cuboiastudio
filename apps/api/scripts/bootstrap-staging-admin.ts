import { PrismaClient, Status } from "@prisma/client";
import { randomUUID } from "node:crypto";
import {
  COMPANY_ADMIN_ROLE_NAMES,
  DEFAULT_COMPANY_ROLE_PERMISSION_MAP,
  RBAC_PERMISSIONS,
} from "../src/auth/rbac.defaults";

function readArg(name: string): string {
  const match = process.argv.find((item) => item.startsWith(`--${name}=`));
  return match ? match.slice(name.length + 3).trim() : "";
}

function requiredArg(name: string): string {
  const value = readArg(name);
  if (!value) {
    throw new Error(`Missing required argument --${name}=...`);
  }
  return value;
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();

  try {
    const email = requiredArg("email").toLowerCase();
    const name = requiredArg("name");
    const companyName = requiredArg("company-name");
    const legalName = readArg("legal-name") || companyName;
    const companyDocument = readArg("document") || null;
    const notes = readArg("notes") || null;
    const userId = readArg("user-id") || `user_${randomUUID().slice(0, 12)}`;
    const companyId = readArg("company-id") || `company_${randomUUID().slice(0, 12)}`;

    const result = await prisma.$transaction(async (tx) => {
      for (const permissionKey of RBAC_PERMISSIONS) {
        await tx.permission.upsert({
          where: { key: permissionKey },
          update: {},
          create: {
            key: permissionKey,
            description: permissionKey,
          },
        });
      }

      const company = await tx.company.upsert({
        where: { id: companyId },
        update: {
          name: companyName,
          legalName,
          document: companyDocument,
          notes,
          status: Status.ACTIVE,
        },
        create: {
          id: companyId,
          name: companyName,
          legalName,
          document: companyDocument,
          notes,
          status: Status.ACTIVE,
        },
      });

      const user = await tx.user.upsert({
        where: { email },
        update: {
          name,
          companyId: company.id,
          activeCompanyId: company.id,
          status: Status.ACTIVE,
          deletedAt: null,
        },
        create: {
          id: userId,
          name,
          email,
          companyId: company.id,
          activeCompanyId: company.id,
          status: Status.ACTIVE,
        },
      });

      await tx.companyMembership.upsert({
        where: {
          userId_companyId: {
            userId: user.id,
            companyId: company.id,
          },
        },
        update: {
          status: Status.ACTIVE,
        },
        create: {
          userId: user.id,
          companyId: company.id,
          status: Status.ACTIVE,
        },
      });

      let adminRoleId = "";

      for (const [roleName, permissions] of Object.entries(DEFAULT_COMPANY_ROLE_PERMISSION_MAP)) {
        const role = await tx.role.upsert({
          where: {
            companyId_name: {
              companyId: company.id,
              name: roleName,
            },
          },
          update: {
            description: `Default ${roleName} role`,
          },
          create: {
            companyId: company.id,
            name: roleName,
            description: `Default ${roleName} role`,
          },
        });

        if (COMPANY_ADMIN_ROLE_NAMES.has(roleName)) {
          adminRoleId = role.id;
        }

        for (const permissionKey of permissions) {
          const permission = await tx.permission.findUnique({
            where: { key: permissionKey },
            select: { id: true },
          });

          if (!permission) {
            throw new Error(`Permission ${permissionKey} not found.`);
          }

          await tx.rolePermission.upsert({
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

      if (!adminRoleId) {
        throw new Error("Could not resolve company admin role.");
      }

      await tx.userRole.upsert({
        where: {
          userId_roleId: {
            userId: user.id,
            roleId: adminRoleId,
          },
        },
        update: {},
        create: {
          userId: user.id,
          roleId: adminRoleId,
        },
      });

      return {
        user,
        company,
        adminRoleId,
      };
    });

    console.log(
      JSON.stringify(
        {
          ok: true,
          userId: result.user.id,
          email: result.user.email,
          companyId: result.company.id,
          companyName: result.company.name,
          adminRoleId: result.adminRoleId,
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
