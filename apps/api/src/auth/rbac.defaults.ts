export const RBAC_PERMISSIONS = [
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
  "companies:manage",
  "users:manage",
] as const;

export const DEFAULT_COMPANY_ROLE_PERMISSION_MAP = {
  owner: RBAC_PERMISSIONS.filter(
    (permission) => permission !== "users:manage" && permission !== "companies:manage",
  ),
  admin: RBAC_PERMISSIONS.filter(
    (permission) => permission !== "users:manage" && permission !== "companies:manage",
  ),
  member: [
    "assistants:read",
    "assistants:write",
    "knowledge:read",
    "knowledge:write",
    "tools:read",
    "channels:read",
    "channels:write",
    "logs:read",
    "usage:read",
    "settings:read",
  ],
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
} satisfies Record<string, readonly string[]>;

export const COMPANY_ADMIN_ROLE_NAMES = new Set(["admin", "owner", "super_admin"]);
export const STUDIO_ADMIN_ROLE_NAMES = new Set(["studio_admin", "studio_owner"]);
