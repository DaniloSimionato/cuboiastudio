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
] as const;

export const DEFAULT_COMPANY_ROLE_PERMISSION_MAP = {
  admin: RBAC_PERMISSIONS,
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
