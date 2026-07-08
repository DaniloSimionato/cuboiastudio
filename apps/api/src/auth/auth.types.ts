import type { Request } from "express";

export interface AuthenticatedUser {
  id: string;
  companyId: string;
  primaryCompanyId: string;
  activeCompanyId: string;
  email: string;
  name: string;
  memberships: string[];
  roles: string[];
  permissions: string[];
}

export interface RequestTenant {
  companyId: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  tenant?: RequestTenant;
  isAuthenticated?: boolean;
}

export const AUTH_PERMISSIONS_KEY = "auth:permissions";
