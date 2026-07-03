import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Ctx = { collapsed: boolean; toggle: () => void; setCollapsed: (v: boolean) => void };

const SidebarCtx = createContext<Ctx | null>(null);
const KEY = "cubo-ai-sidebar-collapsed";

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setCollapsed(raw === "1");
    } catch (error) {
      void error;
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, collapsed ? "1" : "0");
    } catch (error) {
      void error;
    }
  }, [collapsed]);

  return (
    <SidebarCtx.Provider value={{ collapsed, toggle: () => setCollapsed((c) => !c), setCollapsed }}>
      {children}
    </SidebarCtx.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarCtx);
  if (!ctx) throw new Error("useSidebar must be used inside SidebarProvider");
  return ctx;
}
