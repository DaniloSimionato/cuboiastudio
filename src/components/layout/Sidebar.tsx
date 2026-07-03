import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Bot,
  BookOpen,
  Wrench,
  GitBranch,
  Radio,
  PlayCircle,
  ScrollText,
  Braces,
  Brain,
  Settings,
  Sparkles,
  ChevronsLeft,
  ChevronsRight,
  Rocket,
  BarChart3,
  ChevronDown,
  Store,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/lib/sidebar-context";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { currentCompanyService } from "@/services";
import type { CurrentCompanyResponse } from "@/types";

const items = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/agentes", label: "Assistentes IA", icon: Bot },
  { to: "/conhecimento", label: "Base de Conhecimento", icon: BookOpen },
  { to: "/ferramentas", label: "Ferramentas", icon: Wrench },
  { to: "/flow", label: "Flow Builder", icon: GitBranch },
  { to: "/canais", label: "Canais", icon: Radio },
  { to: "/apps", label: "Apps", icon: Store },
  { to: "/implantacao", label: "Assistente de Implantação", icon: Rocket },
  { to: "/consumo", label: "Consumo IA", icon: BarChart3 },
  { to: "/testes", label: "Testes", icon: PlayCircle },
  { to: "/logs", label: "Logs", icon: ScrollText },
  { to: "/variaveis", label: "Variáveis", icon: Braces },
  { to: "/memoria", label: "Memória", icon: Brain },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
] as const;

export function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { collapsed, toggle } = useSidebar();
  const [company, setCompany] = useState<CurrentCompanyResponse["company"] | null>(null);

  useEffect(() => {
    let cancelled = false;

    currentCompanyService
      .get()
      .then((response) => {
        if (!cancelled) {
          setCompany(response.company);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCompany(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <TooltipProvider delayDuration={100}>
      <aside
        className={cn(
          "h-full shrink-0 border-r bg-sidebar text-sidebar-foreground flex flex-col transition-[width] duration-200",
          collapsed ? "w-16" : "w-64",
        )}
      >
        <div
          className={cn(
            "h-16 flex items-center gap-2 border-b",
            collapsed ? "px-3 justify-center" : "px-5",
          )}
        >
          <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground grid place-items-center shrink-0">
            <Sparkles className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="leading-tight flex-1 min-w-0">
              <div className="font-bold text-sm truncate">Cubo AI Studio</div>
              <div className="text-[10px] text-muted-foreground">Módulo IA · Cubo.Chat</div>
            </div>
          )}
        </div>

        <div className={cn("border-b px-2 py-3", collapsed ? "px-2" : "px-3")}>
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  className="h-10 w-full rounded-xl border-sidebar-border bg-sidebar-accent/40 px-0 text-sidebar-foreground"
                  aria-label={company?.name ?? "Tenant atual"}
                >
                  <span className="text-xs font-semibold">
                    {(company?.name ?? "TA").slice(0, 2)}
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">{company?.name ?? "Tenant atual"}</TooltipContent>
            </Tooltip>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="h-11 w-full justify-between rounded-xl border-sidebar-border bg-sidebar-accent/40 px-3 text-left text-sidebar-foreground shadow-sm"
                >
                  <div className="min-w-0 text-left">
                    <div className="truncate text-sm font-medium">
                      {company?.name ?? "Tenant atual"}
                    </div>
                    <div className="truncate text-[10px] text-muted-foreground">Empresa ativa</div>
                  </div>
                  <ChevronDown className="h-4 w-4 shrink-0 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                <DropdownMenuLabel>Tenant atual</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled>
                  {company?.name ?? "Backend indisponível"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    void currentCompanyService
                      .get()
                      .then((response) => setCompany(response.company));
                  }}
                >
                  Atualizar tenant
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <nav className={cn("flex-1 overflow-y-auto py-3 space-y-0.5", collapsed ? "px-2" : "px-2")}>
          {items.map((it) => {
            const active = it.to === "/" ? pathname === "/" : pathname.startsWith(it.to);
            const Icon = it.icon;
            const linkEl = (
              <Link
                key={it.to}
                to={it.to}
                className={cn(
                  "flex items-center gap-3 rounded-lg text-sm transition-colors",
                  collapsed ? "justify-center p-2.5" : "px-3 py-2",
                  active
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-sidebar-foreground hover:bg-sidebar-accent",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="truncate">{it.label}</span>}
              </Link>
            );
            return collapsed ? (
              <Tooltip key={it.to}>
                <TooltipTrigger asChild>{linkEl}</TooltipTrigger>
                <TooltipContent side="right">{it.label}</TooltipContent>
              </Tooltip>
            ) : (
              linkEl
            );
          })}
        </nav>

        <button
          onClick={toggle}
          className={cn(
            "border-t flex items-center gap-2 text-xs text-muted-foreground hover:bg-sidebar-accent transition-colors",
            collapsed ? "justify-center p-3" : "px-4 py-3",
          )}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
        >
          {collapsed ? (
            <ChevronsRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronsLeft className="h-4 w-4" /> Recolher
            </>
          )}
        </button>
      </aside>
    </TooltipProvider>
  );
}
