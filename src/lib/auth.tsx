/* eslint-disable react-refresh/only-export-components */
/**
 * Mock authentication context.
 * IMPORTANT: This is frontend-only scaffolding for prototyping.
 * Real authentication MUST be implemented by the backend with secure sessions.
 *
 * Security rule:
 * - never persist passwords, API keys, tokens, or secrets in the frontend
 * - only keep non-sensitive session metadata here while the backend is not ready
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type AuthUser = {
  id: string;
  nome: string;
  email: string;
  empresa?: string;
  avatar?: string;
  role: "admin" | "operator" | "viewer";
  activeCompanyId?: string | null;
  memberships?: string[];
  roles?: string[];
  permissions?: string[];
};

type StoredUser = AuthUser;

type AuthCtx = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  register: (data: {
    nome: string;
    email: string;
    empresa?: string;
    password: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
};

const Ctx = createContext<AuthCtx | null>(null);
const USERS_KEY = "cubo-ai-mock-users";
const SESSION_KEY = "cubo-ai-session";

function readUsers(): StoredUser[] {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
  } catch (error) {
    void error;
    return [];
  }
}
function writeUsers(u: StoredUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(u));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          const authUser: AuthUser = {
            id: data.id,
            nome: data.name || data.email.split("@")[0],
            email: data.email,
            role: data.roles?.includes("admin") ? "admin" : "operator",
            activeCompanyId: data.activeCompanyId ?? null,
            memberships: Array.isArray(data.memberships) ? data.memberships : [],
            roles: Array.isArray(data.roles) ? data.roles : [],
            permissions: Array.isArray(data.permissions) ? data.permissions : [],
          };
          setUser(authUser);
          sessionStorage.setItem(SESSION_KEY, JSON.stringify(authUser));
          setLoading(false);
          return;
        }
      } catch (err) {
        console.warn("Failed to fetch /api/auth/me, falling back to local session:", err);
      }

      try {
        const raw = sessionStorage.getItem(SESSION_KEY);
        if (raw) setUser(JSON.parse(raw));
      } catch (error) {
        void error;
      }
      setLoading(false);
    };

    void checkAuth();
  }, []);

  const login: AuthCtx["login"] = async (email, password) => {
    if (!email.trim()) return { ok: false, error: "Informe um email válido." };
    if (!password.trim()) return { ok: false, error: "Informe uma senha." };

    const users = readUsers();
    const found = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    const safe: AuthUser = found ?? {
      id: `mock-${email.toLowerCase()}`,
      nome: email.split("@")[0] || "Operador",
      email,
      role: "operator",
    };

    setUser(safe);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(safe));
    return { ok: true };
  };

  const register: AuthCtx["register"] = async ({ nome, email, empresa, password }) => {
    if (!nome.trim()) return { ok: false, error: "Informe seu nome." };
    if (!email.trim()) return { ok: false, error: "Informe um email válido." };
    if (!password.trim()) return { ok: false, error: "Informe uma senha." };

    const users = readUsers();
    if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      return { ok: false, error: "Já existe um usuário com este email." };
    }
    const newUser: StoredUser = {
      id: crypto.randomUUID(),
      nome,
      email,
      empresa,
      role: "admin",
    };
    users.push(newUser);
    writeUsers(users);
    setUser(newUser);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(newUser));
    return { ok: true };
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem(SESSION_KEY);
  };

  return (
    <Ctx.Provider value={{ user, isAuthenticated: !!user, loading, login, register, logout }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
