ALTER TABLE "users"
ALTER COLUMN "companyId" DROP NOT NULL,
ADD COLUMN "passwordHash" TEXT;

ALTER TABLE "users"
DROP CONSTRAINT "users_companyId_fkey";

ALTER TABLE "users"
ADD CONSTRAINT "users_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "permissions" ("id", "key", "description", "createdAt", "updatedAt")
VALUES
  ('permission_studio_users_manage', 'users:manage', 'Manage Studio users and company memberships', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "roles" ("id", "companyId", "name", "description", "createdAt", "updatedAt")
VALUES
  ('role_studio_admin', NULL, 'studio_admin', 'Global Studio administrator', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('role_studio_operator', NULL, 'studio_operator', 'Global Studio operator', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('role_studio_viewer', NULL, 'studio_viewer', 'Global Studio viewer', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "role_permissions" ("id", "roleId", "permissionId", "createdAt")
SELECT 'role_permission_studio_admin_users', 'role_studio_admin', "id", CURRENT_TIMESTAMP
FROM "permissions"
WHERE "key" = 'users:manage'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

INSERT INTO "role_permissions" ("id", "roleId", "permissionId", "createdAt")
SELECT 'role_permission_studio_admin_companies', 'role_studio_admin', "id", CURRENT_TIMESTAMP
FROM "permissions"
WHERE "key" = 'companies:manage'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

INSERT INTO "user_roles" ("id", "userId", "roleId", "createdAt")
SELECT CONCAT('studio_admin_', "user_roles"."userId"), "user_roles"."userId", 'role_studio_admin', CURRENT_TIMESTAMP
FROM "user_roles"
JOIN "roles" ON "roles"."id" = "user_roles"."roleId"
WHERE "roles"."name" IN ('admin', 'owner', 'super_admin')
ON CONFLICT ("userId", "roleId") DO NOTHING;

INSERT INTO "roles" ("id", "companyId", "name", "description", "createdAt", "updatedAt")
SELECT CONCAT('role_owner_', MD5("id")), "id", 'owner', 'Default owner role', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "companies"
ON CONFLICT ("companyId", "name") DO NOTHING;

INSERT INTO "roles" ("id", "companyId", "name", "description", "createdAt", "updatedAt")
SELECT CONCAT('role_member_', MD5("id")), "id", 'member', 'Default member role', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "companies"
ON CONFLICT ("companyId", "name") DO NOTHING;

INSERT INTO "role_permissions" ("id", "roleId", "permissionId", "createdAt")
SELECT
  CONCAT('owner_permission_', MD5("owner"."id" || "source_permissions"."permissionId")),
  "owner"."id",
  "source_permissions"."permissionId",
  CURRENT_TIMESTAMP
FROM "roles" AS "owner"
JOIN "roles" AS "admin"
  ON "admin"."companyId" = "owner"."companyId" AND "admin"."name" = 'admin'
JOIN "role_permissions" AS "source_permissions"
  ON "source_permissions"."roleId" = "admin"."id"
WHERE "owner"."name" = 'owner'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

INSERT INTO "role_permissions" ("id", "roleId", "permissionId", "createdAt")
SELECT
  CONCAT('member_permission_', MD5("member"."id" || "source_permissions"."permissionId")),
  "member"."id",
  "source_permissions"."permissionId",
  CURRENT_TIMESTAMP
FROM "roles" AS "member"
JOIN "roles" AS "implantation"
  ON "implantation"."companyId" = "member"."companyId" AND "implantation"."name" = 'implantation'
JOIN "role_permissions" AS "source_permissions"
  ON "source_permissions"."roleId" = "implantation"."id"
WHERE "member"."name" = 'member'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
