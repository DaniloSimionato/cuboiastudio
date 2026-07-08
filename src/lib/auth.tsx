/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type AuthUser = {
  id: string;
  nome: string;
  email: string;
  empresa?: string;
  avatar?: string;
  role: "admin" | "operator" | "viewer";
  activeCompanyId: string | null;
  memberships?: string[];
  roles?: string[];
  permissions?: string[];
};

type AuthCtx = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  refreshUser: () => Promise<AuthUser | null>;
  logout: () => void;
};

const Ctx = createContext<AuthCtx | null>(null);
const SESSION_KEY = "cubo-ai-session";

function mapAuthUser(data: Record<string, unknown>): AuthUser {
  const roles = Array.isArray(data.roles) ? data.roles.filter((item): item is string => typeof item === "string") : [];
  return {
    id: String(data.id),
    nome: typeof data.name === "string" ? data.name : String(data.email).split("@")[0],
    email: String(data.email),
    role: roles.includes("studio_admin") ? "admin" : roles.includes("studio_viewer") ? "viewer" : "operator",
    activeCompanyId: typeof data.activeCompanyId === "string" ? data.activeCompanyId : null,
    memberships: Array.isArray(data.memberships)
      ? data.memberships.filter((item): item is string => typeof item === "string")
      : [],
    roles,
    permissions: Array.isArray(data.permissions)
      ? data.permissions.filter((item): item is string => typeof item === "string")
      : [],
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async (): Promise<AuthUser | null> => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (!res.ok) {
        setUser(null);
        sessionStorage.removeItem(SESSION_KEY);
        return null;
      }
      const authUser = mapAuthUser((await res.json()) as Record<string, unknown>);
      setUser(authUser);
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(authUser));
      return authUser;
    } catch {
      setUser(null);
      return null;
    }
  };

  useEffect(() => {
    void refreshUser().finally(() => setLoading(false));
  }, []);

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem(SESSION_KEY);
    window.location.assign("/staging/logout");
  };

  return (
    <Ctx.Provider value={{ user, isAuthenticated: !!user, loading, refreshUser, logout }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
